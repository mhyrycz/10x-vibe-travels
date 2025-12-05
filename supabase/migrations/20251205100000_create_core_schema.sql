-- migration: create core schema for vibetravels
-- purpose : establish core enums, helper functions, tables, indexes, and row-level security policies
-- details : defines user metadata tables, plan hierarchy, analytics events, supporting triggers, and security policies
-- caution  : destructive changes are not included; all objects are created conditionally where possible

-- ensure required extensions are available for uuid generation utilities
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- enum definitions
-- -----------------------------------------------------------------------------
-- enumerate user roles within the application context
do $$ begin
    create type user_role_enum as enum ('user', 'admin');
exception when duplicate_object then null;
end $$;

-- trip classification used in profile and plans
do $$ begin
    create type trip_type_enum as enum ('leisure', 'business');
exception when duplicate_object then null;
end $$;

-- comfort level preferences for pacing itineraries
do $$ begin
    create type comfort_level_enum as enum ('relax', 'balanced', 'intense');
exception when duplicate_object then null;
end $$;

-- budget level preferences guiding itinerary tone
do $$ begin
    create type budget_level_enum as enum ('budget', 'moderate', 'luxury');
exception when duplicate_object then null;
end $$;

-- block identifiers for the three-per-day itinerary structure
do $$ begin
    create type block_type_enum as enum ('morning', 'afternoon', 'evening');
exception when duplicate_object then null;
end $$;

-- analytics events captured by the platform
do $$ begin
    create type event_type_enum as enum (
        'account_created',
        'preferences_completed',
        'plan_generated',
        'plan_regenerated',
        'plan_edited',
        'plan_deleted'
    );
exception when duplicate_object then null;
end $$;

-- transport modes selectable at the plan level
do $$ begin
    create type transport_mode_enum as enum ('car', 'walk', 'public');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- helper functions
-- -----------------------------------------------------------------------------
-- function: automatically refresh updated_at timestamp on row modifications
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- table: user_roles
-- stores per-user role metadata linked to supabase auth identities
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role user_role_enum not null default 'user',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger user_roles_set_updated_at
    before update on public.user_roles
    for each row
    execute function public.set_updated_at();

alter table public.user_roles enable row level security;

-- allow authenticated users to read their record or, if admin, any record
create policy user_roles_select_self_or_admin
    on public.user_roles
    for select
    to authenticated
    using (
        user_id = auth.uid()
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    );

-- permit authenticated users to create their own role row as standard users
create policy user_roles_insert_self
    on public.user_roles
    for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and role = 'user'
    );

-- permit authenticated users to update their own row while preserving standard role
create policy user_roles_update_self
    on public.user_roles
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (
        user_id = auth.uid()
        and role = 'user'
    );

-- -----------------------------------------------------------------------------
-- table: user_preferences
-- stores travel preference profile captured during onboarding
-- -----------------------------------------------------------------------------
create table if not exists public.user_preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,
    people_count smallint not null check (people_count between 1 and 20),
    trip_type trip_type_enum not null,
    comfort comfort_level_enum not null,
    budget budget_level_enum not null,
    age smallint not null check (age between 13 and 120),
    country text not null check (char_length(country) between 2 and 120),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
    before update on public.user_preferences
    for each row
    execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

create policy user_preferences_select_self_or_admin
    on public.user_preferences
    for select
    to authenticated
    using (
        user_id = auth.uid()
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    );

create policy user_preferences_insert_self
    on public.user_preferences
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy user_preferences_update_self
    on public.user_preferences
    for update
    to authenticated
    using (
        user_id = auth.uid()
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    )
    with check (user_id = auth.uid());

create policy user_preferences_delete_self
    on public.user_preferences
    for delete
    to authenticated
    using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- table: plans
-- represents a generated itinerary owned by a user
-- -----------------------------------------------------------------------------
create table if not exists public.plans (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null check (char_length(name) between 1 and 140),
    destination_text text not null check (char_length(destination_text) between 1 and 160),
    date_start date not null,
    date_end date not null check (date_end >= date_start),
    people_count smallint not null check (people_count between 1 and 20),
    trip_type trip_type_enum not null,
    comfort comfort_level_enum not null,
    budget budget_level_enum not null,
    transport_modes transport_mode_enum[] null,
    note_text text not null check (char_length(note_text) <= 20000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at
    before update on public.plans
    for each row
    execute function public.set_updated_at();

create index if not exists plans_owner_created_idx
    on public.plans (owner_id, created_at desc);

alter table public.plans enable row level security;

create policy plans_select_owner_or_admin
    on public.plans
    for select
    to authenticated
    using (
        owner_id = auth.uid()
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    );

create policy plans_insert_owner
    on public.plans
    for insert
    to authenticated
    with check (owner_id = auth.uid());

create policy plans_update_owner
    on public.plans
    for update
    to authenticated
    using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

create policy plans_delete_owner
    on public.plans
    for delete
    to authenticated
    using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- table: plan_days
-- captures per-day breakdown of a plan
-- -----------------------------------------------------------------------------
create table if not exists public.plan_days (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references public.plans(id) on delete cascade,
    day_index smallint not null check (day_index between 1 and 30),
    day_date date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint plan_days_plan_day_index_unique unique (plan_id, day_index),
    constraint plan_days_plan_day_date_unique unique (plan_id, day_date)
);

create trigger plan_days_set_updated_at
    before update on public.plan_days
    for each row
    execute function public.set_updated_at();

alter table public.plan_days enable row level security;

create policy plan_days_select_owner
    on public.plan_days
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.plans p
            where p.id = plan_days.plan_id
              and p.owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    );

create policy plan_days_insert_owner
    on public.plan_days
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.plans p
            where p.id = plan_days.plan_id
              and p.owner_id = auth.uid()
        )
    );

create policy plan_days_update_owner
    on public.plan_days
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.plans p
            where p.id = plan_days.plan_id
              and p.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.plans p
            where p.id = plan_days.plan_id
              and p.owner_id = auth.uid()
        )
    );

create policy plan_days_delete_owner
    on public.plan_days
    for delete
    to authenticated
    using (
        exists (
            select 1
            from public.plans p
            where p.id = plan_days.plan_id
              and p.owner_id = auth.uid()
        )
    );

create unique index if not exists plan_days_plan_day_index_idx
    on public.plan_days (plan_id, day_index);

create unique index if not exists plan_days_plan_day_date_idx
    on public.plan_days (plan_id, day_date);

-- -----------------------------------------------------------------------------
-- table: plan_blocks
-- defines morning/afternoon/evening segments for a day
-- -----------------------------------------------------------------------------
create table if not exists public.plan_blocks (
    id uuid primary key default gen_random_uuid(),
    day_id uuid not null references public.plan_days(id) on delete cascade,
    block_type block_type_enum not null,
    created_at timestamptz not null default now(),
    constraint plan_blocks_day_type_unique unique (day_id, block_type)
);

alter table public.plan_blocks enable row level security;

create policy plan_blocks_select_owner
    on public.plan_blocks
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.plan_days pd
            join public.plans p on p.id = pd.plan_id
            where pd.id = plan_blocks.day_id
              and p.owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    );

create policy plan_blocks_insert_owner
    on public.plan_blocks
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.plan_days pd
            join public.plans p on p.id = pd.plan_id
            where pd.id = plan_blocks.day_id
              and p.owner_id = auth.uid()
        )
    );

create policy plan_blocks_update_owner
    on public.plan_blocks
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.plan_days pd
            join public.plans p on p.id = pd.plan_id
            where pd.id = plan_blocks.day_id
              and p.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.plan_days pd
            join public.plans p on p.id = pd.plan_id
            where pd.id = plan_blocks.day_id
              and p.owner_id = auth.uid()
        )
    );

create policy plan_blocks_delete_owner
    on public.plan_blocks
    for delete
    to authenticated
    using (
        exists (
            select 1
            from public.plan_days pd
            join public.plans p on p.id = pd.plan_id
            where pd.id = plan_blocks.day_id
              and p.owner_id = auth.uid()
        )
    );

create unique index if not exists plan_blocks_day_type_idx
    on public.plan_blocks (day_id, block_type);

-- -----------------------------------------------------------------------------
-- table: plan_activities
-- enumerates activities within a block, preserving ordering and timing
-- -----------------------------------------------------------------------------
create table if not exists public.plan_activities (
    id uuid primary key default gen_random_uuid(),
    block_id uuid not null references public.plan_blocks(id) on delete cascade,
    title text not null check (char_length(title) between 1 and 200),
    duration_minutes smallint not null check (duration_minutes between 5 and 720),
    transport_minutes smallint null check (transport_minutes between 0 and 600),
    order_index smallint not null check (order_index between 1 and 50),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint plan_activities_block_order_unique unique (block_id, order_index)
);

create trigger plan_activities_set_updated_at
    before update on public.plan_activities
    for each row
    execute function public.set_updated_at();

alter table public.plan_activities enable row level security;

create policy plan_activities_select_owner
    on public.plan_activities
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.plan_blocks pb
            join public.plan_days pd on pd.id = pb.day_id
            join public.plans p on p.id = pd.plan_id
            where pb.id = plan_activities.block_id
              and p.owner_id = auth.uid()
        )
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    );

create policy plan_activities_insert_owner
    on public.plan_activities
    for insert
    to authenticated
    with check (
        exists (
            select 1
            from public.plan_blocks pb
            join public.plan_days pd on pd.id = pb.day_id
            join public.plans p on p.id = pd.plan_id
            where pb.id = plan_activities.block_id
              and p.owner_id = auth.uid()
        )
    );

create policy plan_activities_update_owner
    on public.plan_activities
    for update
    to authenticated
    using (
        exists (
            select 1
            from public.plan_blocks pb
            join public.plan_days pd on pd.id = pb.day_id
            join public.plans p on p.id = pd.plan_id
            where pb.id = plan_activities.block_id
              and p.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.plan_blocks pb
            join public.plan_days pd on pd.id = pb.day_id
            join public.plans p on p.id = pd.plan_id
            where pb.id = plan_activities.block_id
              and p.owner_id = auth.uid()
        )
    );

create policy plan_activities_delete_owner
    on public.plan_activities
    for delete
    to authenticated
    using (
        exists (
            select 1
            from public.plan_blocks pb
            join public.plan_days pd on pd.id = pb.day_id
            join public.plans p on p.id = pd.plan_id
            where pb.id = plan_activities.block_id
              and p.owner_id = auth.uid()
        )
    );

create unique index if not exists plan_activities_block_order_idx
    on public.plan_activities (block_id, order_index);

-- -----------------------------------------------------------------------------
-- table: events
-- logs key lifecycle actions for analytics and reporting
-- -----------------------------------------------------------------------------
create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    plan_id uuid references public.plans(id) on delete set null,
    event_type event_type_enum not null,
    destination_text text null check (char_length(destination_text) <= 160),
    transport_modes transport_mode_enum[] null,
    trip_length_days smallint null check (trip_length_days between 1 and 30),
    created_at timestamptz not null default now()
);

create index if not exists events_user_created_idx
    on public.events (user_id, created_at desc);

create index if not exists events_type_created_idx
    on public.events (event_type, created_at desc);

alter table public.events enable row level security;

create policy events_select_self_or_admin
    on public.events
    for select
    to authenticated
    using (
        user_id = auth.uid()
        or exists (
            select 1
            from public.user_roles admin_roles
            where admin_roles.user_id = auth.uid()
              and admin_roles.role = 'admin'
        )
    );

create policy events_insert_self
    on public.events
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy events_delete_self
    on public.events
    for delete
    to authenticated
    using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- end of migration
-- -----------------------------------------------------------------------------
