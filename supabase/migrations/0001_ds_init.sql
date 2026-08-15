-- Dreamstack schema. Tables are prefixed ds_ because this database is shared
-- with another app. Applied to the Supabase project via MCP; kept here for
-- reference and future environments.

create table if not exists public.ds_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  gens_used int not null default 0,
  period_start timestamptz not null default date_trunc('month', now()),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.ds_profiles enable row level security;

create policy "ds_profiles_select_own"
  on public.ds_profiles for select
  using (auth.uid() = user_id);
-- All writes to ds_profiles happen via the service role (edge functions).

create table if not exists public.ds_apps (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled app',
  prompt text,
  html text not null,
  slug text not null unique,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ds_apps enable row level security;

create policy "ds_apps_owner_all"
  on public.ds_apps for all
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

create policy "ds_apps_public_read"
  on public.ds_apps for select
  using (is_public = true);

create index if not exists ds_apps_owner_idx on public.ds_apps (owner);
create index if not exists ds_apps_slug_idx on public.ds_apps (slug);

create or replace function public.ds_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ds_apps_touch on public.ds_apps;
create trigger ds_apps_touch
  before update on public.ds_apps
  for each row execute function public.ds_touch_updated_at();
