-- Migration: Remove blocks abstraction and link activities directly to days
-- Description: Removes plan_blocks table and adds day_id foreign key to plan_activities
-- Purpose: Simplify itinerary structure from plans→days→blocks→activities to plans→days→activities
-- Created: 2026-01-05
-- WARNING: This is a destructive migration. All existing plan data will be lost.
--          Only run in development environment.

-- -----------------------------------------------------------------------------
-- Step 1: Drop the move_activity_transaction function (depends on block_id)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS move_activity_transaction(UUID, UUID, INTEGER);

-- -----------------------------------------------------------------------------
-- Step 2: Drop plan_activities table (will be recreated with new structure)
-- -----------------------------------------------------------------------------
-- This cascade drops indexes and constraints
DROP TABLE IF EXISTS public.plan_activities CASCADE;

-- -----------------------------------------------------------------------------
-- Step 3: Drop plan_blocks table entirely
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.plan_blocks CASCADE;

-- -----------------------------------------------------------------------------
-- Step 4: Drop block_type_enum as it's no longer needed
-- -----------------------------------------------------------------------------
DROP TYPE IF EXISTS block_type_enum CASCADE;

-- -----------------------------------------------------------------------------
-- Step 5: Recreate plan_activities table with day_id instead of block_id
-- -----------------------------------------------------------------------------
CREATE TABLE public.plan_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID NOT NULL REFERENCES public.plan_days(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    duration_minutes SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 720),
    transport_minutes SMALLINT NULL CHECK (transport_minutes BETWEEN 0 AND 600),
    order_index SMALLINT NOT NULL CHECK (order_index BETWEEN 1 AND 50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add trigger for updated_at timestamp
CREATE TRIGGER plan_activities_set_updated_at
    BEFORE UPDATE ON public.plan_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Add index for efficient lookups by day
CREATE INDEX plan_activities_day_order_idx
    ON public.plan_activities (day_id, order_index);

-- Enable row level security
ALTER TABLE public.plan_activities ENABLE ROW LEVEL SECURITY;

-- POLICIES DISABLED FOR LOCAL DEVELOPMENT
-- Uncomment below to enable row-level security policies in production

-- CREATE POLICY plan_activities_select_owner
--     ON public.plan_activities
--     FOR SELECT
--     TO authenticated
--     USING (
--         EXISTS (
--             SELECT 1
--             FROM public.plan_days pd
--             JOIN public.plans p ON p.id = pd.plan_id
--             WHERE pd.id = plan_activities.day_id
--               AND p.owner_id = auth.uid()
--         )
--         OR EXISTS (
--             SELECT 1
--             FROM public.user_roles admin_roles
--             WHERE admin_roles.user_id = auth.uid()
--               AND admin_roles.role = 'admin'
--         )
--     );

-- CREATE POLICY plan_activities_insert_owner
--     ON public.plan_activities
--     FOR INSERT
--     TO authenticated
--     WITH CHECK (
--         EXISTS (
--             SELECT 1
--             FROM public.plan_days pd
--             JOIN public.plans p ON p.id = pd.plan_id
--             WHERE pd.id = plan_activities.day_id
--               AND p.owner_id = auth.uid()
--         )
--     );

-- CREATE POLICY plan_activities_update_owner
--     ON public.plan_activities
--     FOR UPDATE
--     TO authenticated
--     USING (
--         EXISTS (
--             SELECT 1
--             FROM public.plan_days pd
--             JOIN public.plans p ON p.id = pd.plan_id
--             WHERE pd.id = plan_activities.day_id
--               AND p.owner_id = auth.uid()
--         )
--     )
--     WITH CHECK (
--         EXISTS (
--             SELECT 1
--             FROM public.plan_days pd
--             JOIN public.plans p ON p.id = pd.plan_id
--             WHERE pd.id = plan_activities.day_id
--               AND p.owner_id = auth.uid()
--         )
--     );

-- CREATE POLICY plan_activities_delete_owner
--     ON public.plan_activities
--     FOR DELETE
--     TO authenticated
--     USING (
--         EXISTS (
--             SELECT 1
--             FROM public.plan_days pd
--             JOIN public.plans p ON p.id = pd.plan_id
--             WHERE pd.id = plan_activities.day_id
--               AND p.owner_id = auth.uid()
--         )
--     );

-- -----------------------------------------------------------------------------
-- Step 6: Create new move_activity_transaction function for day-based moves
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION move_activity_transaction(
  p_activity_id UUID,
  p_target_day_id UUID,
  p_target_order_index INTEGER
)
RETURNS TABLE (
  id UUID,
  day_id UUID,
  title TEXT,
  duration_minutes SMALLINT,
  transport_minutes SMALLINT,
  order_index SMALLINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_day_id UUID;
  v_current_order_index INTEGER;
BEGIN
  -- Lock the activity row for update to prevent race conditions
  SELECT pa.day_id, pa.order_index
  INTO v_current_day_id, v_current_order_index
  FROM plan_activities pa
  WHERE pa.id = p_activity_id
  FOR UPDATE;

  -- Handle NULL case (activity not found - will be caught by caller)
  IF v_current_day_id IS NULL THEN
    RETURN;
  END IF;

  -- Case 1: Moving to a different day
  IF v_current_day_id != p_target_day_id THEN
    -- Step 1: Compact source day (remove gap)
    UPDATE plan_activities pa
    SET order_index = pa.order_index - 1,
        updated_at = NOW()
    WHERE pa.day_id = v_current_day_id
      AND pa.order_index > v_current_order_index;

    -- Step 2: Make space in target day (shift items down)
    UPDATE plan_activities pa
    SET order_index = pa.order_index + 1,
        updated_at = NOW()
    WHERE pa.day_id = p_target_day_id
      AND pa.order_index >= p_target_order_index;

    -- Step 3: Move activity to target position
    UPDATE plan_activities pa
    SET day_id = p_target_day_id,
        order_index = p_target_order_index,
        updated_at = NOW()
    WHERE pa.id = p_activity_id;

  -- Case 2: Moving within same day
  ELSE
    -- Case 2a: Moving down (to higher order_index)
    -- Example: moving position 1 → 3, so positions 2,3 shift up to 1,2
    IF p_target_order_index > v_current_order_index THEN
      -- Shift activities between current and target up by 1 position
      -- Process from lowest to highest to avoid constraint violations
      FOR i IN (v_current_order_index + 1)..p_target_order_index LOOP
        UPDATE plan_activities pa
        SET order_index = i - 1,
            updated_at = NOW()
        WHERE pa.day_id = v_current_day_id
          AND pa.order_index = i;
      END LOOP;

      -- Move activity to target position
      UPDATE plan_activities pa
      SET order_index = p_target_order_index,
          updated_at = NOW()
      WHERE pa.id = p_activity_id;

    -- Case 2b: Moving up (to lower order_index)
    -- Example: moving position 3 → 1, so positions 1,2 shift down to 2,3
    ELSIF p_target_order_index < v_current_order_index THEN
      -- Shift activities between target and current down by 1 position
      -- Process from highest to lowest to avoid constraint violations
      FOR i IN REVERSE (v_current_order_index - 1)..p_target_order_index LOOP
        UPDATE plan_activities pa
        SET order_index = i + 1,
            updated_at = NOW()
        WHERE pa.day_id = v_current_day_id
          AND pa.order_index = i;
      END LOOP;

      -- Move activity to target position
      UPDATE plan_activities pa
      SET order_index = p_target_order_index,
          updated_at = NOW()
      WHERE pa.id = p_activity_id;

    -- Case 2c: No movement (same position) - just update timestamp
    ELSE
      UPDATE plan_activities pa
      SET updated_at = NOW()
      WHERE pa.id = p_activity_id;
    END IF;
  END IF;

  -- Return the updated activity
  RETURN QUERY
  SELECT pa.id, pa.day_id, pa.title, pa.duration_minutes,
         pa.transport_minutes, pa.order_index, pa.created_at, pa.updated_at
  FROM plan_activities pa
  WHERE pa.id = p_activity_id;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION move_activity_transaction IS
  'Atomically moves an activity to a different day/position. Handles same-day and cross-day moves with proper order_index management. Used by the Move Activity API endpoint.';

-- -----------------------------------------------------------------------------
-- Migration complete
-- -----------------------------------------------------------------------------
-- Schema changes:
-- - Removed plan_blocks table
-- - Removed block_type_enum
-- - Updated plan_activities to reference day_id instead of block_id
-- - Updated move_activity_transaction function to work with days instead of blocks
-- - Simplified structure: plans → plan_days → plan_activities
