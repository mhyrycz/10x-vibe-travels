-- Migration: Fix RLS Infinite Recursion
-- Description: Fixes infinite recursion in user_roles policies by simplifying them
-- Purpose: Remove circular dependency in admin role checks
-- Created: 2026-01-06

-- -----------------------------------------------------------------------------
-- Drop existing policies that cause infinite recursion
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;
DROP POLICY IF EXISTS user_preferences_select_self_or_admin ON public.user_preferences;
DROP POLICY IF EXISTS user_preferences_update_self ON public.user_preferences;
DROP POLICY IF EXISTS plans_select_owner_or_admin ON public.plans;
DROP POLICY IF EXISTS plan_days_select_owner ON public.plan_days;
DROP POLICY IF EXISTS plan_activities_select_owner ON public.plan_activities;
DROP POLICY IF EXISTS events_select_admin ON public.events;

-- -----------------------------------------------------------------------------
-- Recreate user_roles policies WITHOUT admin checks (prevents infinite recursion)
-- -----------------------------------------------------------------------------

CREATE POLICY user_roles_select_self
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Recreate other policies with simplified logic
-- -----------------------------------------------------------------------------

-- User Preferences - Only allow users to see their own preferences
CREATE POLICY user_preferences_select_self
    ON public.user_preferences
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY user_preferences_update_self_only
    ON public.user_preferences
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Plans - Only allow users to see their own plans
CREATE POLICY plans_select_owner
    ON public.plans
    FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());

-- Plan Days - Only allow users to see days from their own plans
CREATE POLICY plan_days_select_owner_only
    ON public.plan_days
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.plans
            WHERE plans.id = plan_days.plan_id
              AND plans.owner_id = auth.uid()
        )
    );

-- Plan Activities - Only allow users to see activities from their own plans
CREATE POLICY plan_activities_select_owner_only
    ON public.plan_activities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.plan_days pd
            JOIN public.plans p ON p.id = pd.plan_id
            WHERE pd.id = plan_activities.day_id
              AND p.owner_id = auth.uid()
        )
    );

-- Events - Allow authenticated users to insert events (for tracking)
-- No SELECT policy - events are for backend analytics only
CREATE POLICY events_insert_any_authenticated
    ON public.events
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Migration complete
-- -----------------------------------------------------------------------------
-- Fixed infinite recursion by:
-- 1. Removing admin role checks from user_roles (circular dependency)
-- 2. Simplifying all policies to only check ownership (auth.uid())
-- 3. Admin features can be implemented later with a separate admin schema
--    or by using service_role key for admin operations
