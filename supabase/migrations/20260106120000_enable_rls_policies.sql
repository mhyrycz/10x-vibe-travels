-- Migration: Enable Row Level Security (RLS) Policies
-- Description: Activates RLS policies for authentication enforcement across all tables
-- Purpose: Enable secure multi-user access with proper authorization checks
-- Created: 2026-01-06
-- NOTE: This migration should be run after authentication is fully implemented

-- -----------------------------------------------------------------------------
-- Enable RLS Policies for user_roles table
-- -----------------------------------------------------------------------------

CREATE POLICY user_roles_select_self_or_admin
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.user_roles admin_roles
            WHERE admin_roles.user_id = auth.uid()
              AND admin_roles.role = 'admin'
        )
    );

CREATE POLICY user_roles_insert_self
    ON public.user_roles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND role = 'user'
    );

CREATE POLICY user_roles_update_self
    ON public.user_roles
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND role = 'user'
    );

-- -----------------------------------------------------------------------------
-- Enable RLS Policies for user_preferences table
-- -----------------------------------------------------------------------------

CREATE POLICY user_preferences_select_self_or_admin
    ON public.user_preferences
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.user_roles admin_roles
            WHERE admin_roles.user_id = auth.uid()
              AND admin_roles.role = 'admin'
        )
    );

CREATE POLICY user_preferences_insert_self
    ON public.user_preferences
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_update_self
    ON public.user_preferences
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.user_roles admin_roles
            WHERE admin_roles.user_id = auth.uid()
              AND admin_roles.role = 'admin'
        )
    )
    WITH CHECK (user_id = auth.uid());

CREATE POLICY user_preferences_delete_self
    ON public.user_preferences
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Enable RLS Policies for plans table
-- -----------------------------------------------------------------------------

CREATE POLICY plans_select_owner_or_admin
    ON public.plans
    FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.user_roles admin_roles
            WHERE admin_roles.user_id = auth.uid()
              AND admin_roles.role = 'admin'
        )
    );

CREATE POLICY plans_insert_owner
    ON public.plans
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY plans_update_owner
    ON public.plans
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY plans_delete_owner
    ON public.plans
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Enable RLS Policies for plan_days table
-- -----------------------------------------------------------------------------

CREATE POLICY plan_days_select_owner
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
        OR EXISTS (
            SELECT 1
            FROM public.user_roles admin_roles
            WHERE admin_roles.user_id = auth.uid()
              AND admin_roles.role = 'admin'
        )
    );

CREATE POLICY plan_days_insert_owner
    ON public.plan_days
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.plans
            WHERE plans.id = plan_days.plan_id
              AND plans.owner_id = auth.uid()
        )
    );

CREATE POLICY plan_days_update_owner
    ON public.plan_days
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.plans
            WHERE plans.id = plan_days.plan_id
              AND plans.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.plans
            WHERE plans.id = plan_days.plan_id
              AND plans.owner_id = auth.uid()
        )
    );

CREATE POLICY plan_days_delete_owner
    ON public.plan_days
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.plans
            WHERE plans.id = plan_days.plan_id
              AND plans.owner_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- Enable RLS Policies for plan_activities table
-- -----------------------------------------------------------------------------

CREATE POLICY plan_activities_select_owner
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
        OR EXISTS (
            SELECT 1
            FROM public.user_roles admin_roles
            WHERE admin_roles.user_id = auth.uid()
              AND admin_roles.role = 'admin'
        )
    );

CREATE POLICY plan_activities_insert_owner
    ON public.plan_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.plan_days pd
            JOIN public.plans p ON p.id = pd.plan_id
            WHERE pd.id = plan_activities.day_id
              AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY plan_activities_update_owner
    ON public.plan_activities
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.plan_days pd
            JOIN public.plans p ON p.id = pd.plan_id
            WHERE pd.id = plan_activities.day_id
              AND p.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.plan_days pd
            JOIN public.plans p ON p.id = pd.plan_id
            WHERE pd.id = plan_activities.day_id
              AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY plan_activities_delete_owner
    ON public.plan_activities
    FOR DELETE
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

-- -----------------------------------------------------------------------------
-- Enable RLS Policies for events table
-- -----------------------------------------------------------------------------

CREATE POLICY events_select_admin
    ON public.events
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles admin_roles
            WHERE admin_roles.user_id = auth.uid()
              AND admin_roles.role = 'admin'
        )
    );

CREATE POLICY events_insert_authenticated
    ON public.events
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Migration complete
-- -----------------------------------------------------------------------------
-- All RLS policies have been enabled for:
-- - user_roles
-- - user_preferences  
-- - plans
-- - plan_days
-- - plan_activities
-- - events
--
-- Users can now only access their own data unless they have admin role.
-- Middleware ensures authentication before reaching database layer.
