-- Subcontractor teams + workers for the Crew tab and board autocomplete

create table if not exists public.sub_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sub_workers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.sub_teams (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, name)
);

create index if not exists sub_teams_sort_idx on public.sub_teams (sort_order);
create index if not exists sub_workers_team_idx on public.sub_workers (team_id, sort_order);

drop trigger if exists sub_teams_updated_at on public.sub_teams;
create trigger sub_teams_updated_at
  before update on public.sub_teams
  for each row execute function public.set_updated_at();

drop trigger if exists sub_workers_updated_at on public.sub_workers;
create trigger sub_workers_updated_at
  before update on public.sub_workers
  for each row execute function public.set_updated_at();

alter table public.sub_teams enable row level security;
alter table public.sub_workers enable row level security;

create policy "Service role manages sub_teams"
  on public.sub_teams for all
  using (true)
  with check (true);

create policy "Service role manages sub_workers"
  on public.sub_workers for all
  using (true)
  with check (true);
