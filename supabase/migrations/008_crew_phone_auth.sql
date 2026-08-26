-- Phone login for crew portal

-- Allow phone provider; email optional for phone-only accounts
alter table public.crew_users
  drop constraint if exists crew_users_provider_check;

alter table public.crew_users
  add constraint crew_users_provider_check
  check (provider in ('google', 'apple', 'microsoft', 'github', 'phone'));

alter table public.crew_users
  alter column email drop not null;

alter table public.crew_users
  add column if not exists phone text;

create index if not exists crew_users_phone_idx
  on public.crew_users (phone)
  where phone is not null;

-- One-time codes for phone sign-in
create table if not exists public.crew_login_otps (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists crew_login_otps_phone_idx
  on public.crew_login_otps (phone_e164);

create index if not exists crew_login_otps_expires_idx
  on public.crew_login_otps (expires_at);

alter table public.crew_login_otps enable row level security;
