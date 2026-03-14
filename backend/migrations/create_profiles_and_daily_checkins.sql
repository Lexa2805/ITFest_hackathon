-- ---------------------------------------------------------------------------
-- Profiles and Daily Check-ins
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text,
    email text,
    weight double precision,
    height double precision,
    age integer,
    gender text,
    activity_level text,
    goal text,
    has_apple_watch boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.daily_checkins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    date date not null,
    heart_rate double precision not null,
    sleep_hours double precision not null,
    steps integer not null,
    calories double precision,
    mood integer not null check (mood between 1 and 5),
    stress_level integer not null check (stress_level between 1 and 5),
    physical_state_score integer not null check (physical_state_score between 0 and 100),
    created_at timestamptz not null default now(),
    unique(user_id, date)
);

create index if not exists idx_profiles_updated_at
    on public.profiles(updated_at desc);

create index if not exists idx_daily_checkins_user_date
    on public.daily_checkins(user_id, date desc);

alter table public.profiles enable row level security;
alter table public.daily_checkins enable row level security;

drop policy if exists "Users can select own profile" on public.profiles;
create policy "Users can select own profile"
    on public.profiles for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can select own daily checkins" on public.daily_checkins;
create policy "Users can select own daily checkins"
    on public.daily_checkins for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily checkins" on public.daily_checkins;
create policy "Users can insert own daily checkins"
    on public.daily_checkins for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily checkins" on public.daily_checkins;
create policy "Users can update own daily checkins"
    on public.daily_checkins for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
