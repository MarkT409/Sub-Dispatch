-- App roles + weekly job board crew rows

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'admin'
    check (role in ('super_admin', 'admin')),
  board_write boolean not null default false,
  active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_role_idx on public.app_users (role);
create index if not exists app_users_email_idx on public.app_users (email);

create table if not exists public.board_crews (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  row_slots int not null default 5,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists board_crews_sort_idx on public.board_crews (sort_order);

-- Seed board crew leads to match the weekly Sheet layout
insert into public.board_crews (name, sort_order, row_slots)
values
  ('FALIK', 1, 5),
  ('RAFAEL', 2, 6),
  ('ANDREW', 3, 5),
  ('MIKE', 4, 6),
  ('VARO', 5, 5),
  ('LOGAN', 6, 5),
  ('STONE', 7, 5),
  ('JEAN', 8, 5),
  ('GMA', 9, 2),
  ('BOTAS', 10, 2)
on conflict (name) do nothing;

drop trigger if exists app_users_updated_at on public.app_users;
create trigger app_users_updated_at
  before update on public.app_users
  for each row execute function public.set_updated_at();

drop trigger if exists board_crews_updated_at on public.board_crews;
create trigger board_crews_updated_at
  before update on public.board_crews
  for each row execute function public.set_updated_at();

alter table public.app_users enable row level security;
alter table public.board_crews enable row level security;

create policy "Service role manages app_users"
  on public.app_users for all
  using (true)
  with check (true);

create policy "Service role manages board_crews"
  on public.board_crews for all
  using (true)
  with check (true);
