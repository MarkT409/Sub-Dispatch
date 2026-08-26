-- Magic login links for crew (phone SMS + email)

create table if not exists public.crew_login_links (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('phone', 'email')),
  destination text not null,
  token_hash text not null unique,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crew_login_links_destination_idx
  on public.crew_login_links (channel, destination);

create index if not exists crew_login_links_expires_idx
  on public.crew_login_links (expires_at);

alter table public.crew_login_links enable row level security;
