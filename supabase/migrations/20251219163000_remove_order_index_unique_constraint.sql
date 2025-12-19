-- Migration: Remove unique constraint on (block_id, order_index) from plan_activities
-- Description: Drops the unique constraint to allow temporary duplicate order_index values during reordering operations
-- Created: 2025-12-19
-- Reason: The unique constraint prevents atomic reordering of activities within blocks, causing constraint violations
--         during move operations. Removing it allows more flexible reordering logic.

-- Drop the unique constraint
ALTER TABLE public.plan_activities
DROP CONSTRAINT IF EXISTS plan_activities_block_order_unique;

-- Drop the unique index (this was created separately from the constraint)
DROP INDEX IF EXISTS public.plan_activities_block_order_idx;

-- Optional: Create a non-unique index for query performance (order_index is still used for sorting)
-- This maintains query performance without enforcing uniqueness
CREATE INDEX IF NOT EXISTS plan_activities_block_order_idx
    ON public.plan_activities (block_id, order_index);

-- Add comment for documentation
COMMENT ON INDEX plan_activities_block_order_idx IS
  'Non-unique index on (block_id, order_index) for query performance. Uniqueness is enforced at application level during stable states.';
