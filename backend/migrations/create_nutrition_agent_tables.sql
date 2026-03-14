-- ---------------------------------------------------------------------------
-- Nutrition Agent tables and profile target columns
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Store daily target outputs from calorie calculator on profile rows.
alter table if exists public.profiles
    add column if not exists daily_kcal_target integer,
    add column if not exists protein_target_g integer,
    add column if not exists fat_target_g integer,
    add column if not exists carbs_target_g integer;

-- Fridge inventory table for nutrition agent.
create table if not exists public.fridge_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    ingredient_name text,
    name text,
    quantity double precision not null check (quantity > 0),
    unit text not null,
    category text default 'other',
    expiry_date date,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_fridge_items_user_created
    on public.fridge_items(user_id, created_at desc);

-- Generated meal plans from Claude.
create table if not exists public.meal_plans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    plan_json jsonb not null,
    total_kcal integer not null,
    total_protein integer not null,
    total_fat integer not null,
    total_carbs integer not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_meal_plans_user_date
    on public.meal_plans(user_id, date desc);

-- Daily consumed meal logs.
create table if not exists public.meal_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    meal_name text not null,
    ingredients_json jsonb not null default '[]'::jsonb,
    kcal integer not null default 0,
    protein integer not null default 0,
    fat integer not null default 0,
    carbs integer not null default 0,
    time_of_day text not null check (time_of_day in ('breakfast', 'lunch', 'dinner', 'snack')),
    created_at timestamptz not null default now()
);

create index if not exists idx_meal_logs_user_date
    on public.meal_logs(user_id, date desc);

-- Basic RLS policies for client-safe access when needed.
alter table public.fridge_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_logs enable row level security;

drop policy if exists "Users can select own fridge items" on public.fridge_items;
create policy "Users can select own fridge items"
    on public.fridge_items for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own fridge items" on public.fridge_items;
create policy "Users can insert own fridge items"
    on public.fridge_items for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own fridge items" on public.fridge_items;
create policy "Users can delete own fridge items"
    on public.fridge_items for delete
    using (auth.uid() = user_id);

drop policy if exists "Users can update own fridge items" on public.fridge_items;
create policy "Users can update own fridge items"
    on public.fridge_items for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can select own meal plans" on public.meal_plans;
create policy "Users can select own meal plans"
    on public.meal_plans for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own meal plans" on public.meal_plans;
create policy "Users can insert own meal plans"
    on public.meal_plans for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can select own meal logs" on public.meal_logs;
create policy "Users can select own meal logs"
    on public.meal_logs for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own meal logs" on public.meal_logs;
create policy "Users can insert own meal logs"
    on public.meal_logs for insert
    with check (auth.uid() = user_id);
