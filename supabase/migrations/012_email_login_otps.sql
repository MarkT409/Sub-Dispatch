-- Email OTP codes for admin/crew email sign-in

create table if not exists public.email_login_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists email_login_otps_email_idx
  on public.email_login_otps (email);

create index if not exists email_login_otps_expires_idx
  on public.email_login_otps (expires_at);

alter table public.email_login_otps enable row level security;

-- Allow email OTP as a crew_users provider
alter table public.crew_users
  drop constraint if exists crew_users_provider_check;

alter table public.crew_users
  add constraint crew_users_provider_check
  check (provider in ('google', 'apple', 'microsoft', 'github', 'phone', 'email'));
