-- Lantana admin schema (run in Supabase SQL editor)

create extension if not exists "pgcrypto";

-- Crew roster
create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  default_rate numeric(12, 2),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jobs (incoming leads / outgoing scheduled work / sheet-synced field work)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client text,
  job_type text not null check (job_type in ('incoming', 'outgoing')),
  status text not null default 'lead'
    check (status in ('lead', 'scheduled', 'in_progress', 'complete', 'cancelled')),
  site_address text,
  start_date date,
  end_date date,
  work_date date,
  crew_lead text,
  assigned_to text,
  work_kind text check (work_kind is null or work_kind in ('rough', 'trim', 'service', 'unknown')),
  plan_name text,
  plan_sqft text,
  quoted_amount numeric(12, 2),
  invoice_gross numeric(12, 2),
  invoice_payout numeric(12, 2),
  invoice_profit numeric(12, 2),
  invoice_row_key text unique,
  invoice_week text,
  notes text,
  sheets_row_key text unique,
  sheets_week text,
  source text not null default 'manual'
    check (source in ('manual', 'google_sheets', 'invoice')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Money received
create table if not exists public.payments_in (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  received_at date not null default current_date,
  method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Money paid to crews
create table if not exists public.payments_out (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs (id) on delete set null,
  crew_member_id uuid references public.crew_members (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  paid_at date not null default current_date,
  method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_type_idx on public.jobs (job_type);
create index if not exists jobs_work_date_idx on public.jobs (work_date desc nulls last);
create index if not exists jobs_sheets_week_idx on public.jobs (sheets_week);
create index if not exists payments_in_received_at_idx on public.payments_in (received_at desc);
create index if not exists payments_out_paid_at_idx on public.payments_out (paid_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crew_members_updated_at on public.crew_members;
create trigger crew_members_updated_at
  before update on public.crew_members
  for each row execute function public.set_updated_at();

drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

drop trigger if exists payments_in_updated_at on public.payments_in;
create trigger payments_in_updated_at
  before update on public.payments_in
  for each row execute function public.set_updated_at();

drop trigger if exists payments_out_updated_at on public.payments_out;
create trigger payments_out_updated_at
  before update on public.payments_out
  for each row execute function public.set_updated_at();

-- Authenticated admins only (allowlist enforced in app; RLS requires login)
alter table public.crew_members enable row level security;
alter table public.jobs enable row level security;
alter table public.payments_in enable row level security;
alter table public.payments_out enable row level security;

create policy "Authenticated users can manage crew"
  on public.crew_members for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage jobs"
  on public.jobs for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage payments_in"
  on public.payments_in for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage payments_out"
  on public.payments_out for all
  to authenticated
  using (true)
  with check (true);

-- Push subscriptions (admin PWA devices)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_admin_email_idx
  on public.push_subscriptions (admin_email);

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "Authenticated users can manage push_subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (true)
  with check (true);
