-- Migration: Drop unique constraint on plan_activities (day_id, order_index)
-- Description: Remove constraint that prevents temporary duplicate order_index during moves
-- Created: 2026-01-05
-- Reason: The move_activity_transaction function needs to temporarily have duplicates
--         while shifting activities. The constraint was too restrictive.

ALTER TABLE public.plan_activities
DROP CONSTRAINT IF EXISTS plan_activities_day_order_unique;
