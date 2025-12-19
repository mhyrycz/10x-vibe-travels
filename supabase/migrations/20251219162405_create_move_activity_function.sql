-- Migration: Create move_activity_transaction function
-- Description: Atomically moves an activity to a different block/position while maintaining order_index integrity
-- Created: 2025-12-19

CREATE OR REPLACE FUNCTION move_activity_transaction(
  p_activity_id UUID,
  p_target_block_id UUID,
  p_target_order_index INTEGER
)
RETURNS TABLE (
  id UUID,
  block_id UUID,
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
  v_current_block_id UUID;
  v_current_order_index INTEGER;
BEGIN
  -- Lock the activity row for update to prevent race conditions
  SELECT pa.block_id, pa.order_index
  INTO v_current_block_id, v_current_order_index
  FROM plan_activities pa
  WHERE pa.id = p_activity_id
  FOR UPDATE;

  -- Handle NULL case (activity not found - will be caught by caller)
  IF v_current_block_id IS NULL THEN
    RETURN;
  END IF;

  -- Case 1: Moving to a different block
  IF v_current_block_id != p_target_block_id THEN
    -- Step 1: Compact source block (remove gap)
    UPDATE plan_activities pa
    SET order_index = pa.order_index - 1,
        updated_at = NOW()
    WHERE pa.block_id = v_current_block_id
      AND pa.order_index > v_current_order_index;

    -- Step 2: Make space in target block (shift items down)
    UPDATE plan_activities pa
    SET order_index = pa.order_index + 1,
        updated_at = NOW()
    WHERE pa.block_id = p_target_block_id
      AND pa.order_index >= p_target_order_index;

    -- Step 3: Move activity to target position
    UPDATE plan_activities pa
    SET block_id = p_target_block_id,
        order_index = p_target_order_index,
        updated_at = NOW()
    WHERE pa.id = p_activity_id;

  -- Case 2: Moving within same block
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
        WHERE pa.block_id = v_current_block_id
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
        WHERE pa.block_id = v_current_block_id
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
  SELECT pa.id, pa.block_id, pa.title, pa.duration_minutes,
         pa.transport_minutes, pa.order_index, pa.created_at, pa.updated_at
  FROM plan_activities pa
  WHERE pa.id = p_activity_id;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION move_activity_transaction IS
  'Atomically moves an activity to a different block/position. Handles same-block and cross-block moves with proper order_index management. Used by the Move Activity API endpoint.';
