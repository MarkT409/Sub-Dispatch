-- Crew dispatch system: authentication and job assignments

-- Crew users for authentication (separate from crew_members roster)
-- Links SSO providers (Google, Apple, Microsoft) to crew members
create table if not exists public.crew_users (
  id uuid primary key default gen_random_uuid(),
  crew_member_id uuid references public.crew_members (id) on delete cascade,
  
  -- SSO provider info
  provider text not null check (provider in ('google', 'apple', 'microsoft', 'github')),
  provider_account_id text not null,
  email text not null,
  name text,
  avatar_url text,
  
  -- Notification preferences
  push_notifications_enabled boolean not null default true,
  email_notifications_enabled boolean not null default true,
  
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (provider, provider_account_id)
);

create index if not exists crew_users_crew_member_id_idx on public.crew_users (crew_member_id);
create index if not exists crew_users_email_idx on public.crew_users (email);

-- Job assignments: tracks which crew members are assigned to jobs
-- Supports accept/decline workflow
create table if not exists public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  crew_member_id uuid not null references public.crew_members (id) on delete cascade,
  
  -- Assignment status
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  
  -- Role on this job
  role text not null default 'crew'
    check (role in ('lead', 'crew', 'helper')),
  
  -- Timestamps
  assigned_at timestamptz not null default now(),
  responded_at timestamptz,
  notified_at timestamptz,
  
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique (job_id, crew_member_id)
);

create index if not exists job_assignments_job_id_idx on public.job_assignments (job_id);
create index if not exists job_assignments_crew_member_id_idx on public.job_assignments (crew_member_id);
create index if not exists job_assignments_status_idx on public.job_assignments (status);
create index if not exists job_assignments_assigned_at_idx on public.job_assignments (assigned_at desc);

-- Push subscriptions for crew members (separate from admin)
create table if not exists public.crew_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  crew_user_id uuid not null references public.crew_users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crew_push_subscriptions_crew_user_id_idx 
  on public.crew_push_subscriptions (crew_user_id);

-- Triggers for updated_at
drop trigger if exists crew_users_updated_at on public.crew_users;
create trigger crew_users_updated_at
  before update on public.crew_users
  for each row execute function public.set_updated_at();

drop trigger if exists job_assignments_updated_at on public.job_assignments;
create trigger job_assignments_updated_at
  before update on public.job_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists crew_push_subscriptions_updated_at on public.crew_push_subscriptions;
create trigger crew_push_subscriptions_updated_at
  before update on public.crew_push_subscriptions
  for each row execute function public.set_updated_at();

-- RLS policies
alter table public.crew_users enable row level security;
alter table public.job_assignments enable row level security;
alter table public.crew_push_subscriptions enable row level security;

-- Admins can manage everything
create policy "Authenticated users can manage crew_users"
  on public.crew_users for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage job_assignments"
  on public.job_assignments for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage crew_push_subscriptions"
  on public.crew_push_subscriptions for all
  to authenticated
  using (true)
  with check (true);

-- Helper view: jobs with assignment counts
create or replace view public.jobs_with_assignments as
select 
  j.*,
  count(ja.id) filter (where ja.status = 'pending') as pending_assignments,
  count(ja.id) filter (where ja.status = 'accepted') as accepted_assignments,
  count(ja.id) filter (where ja.status = 'declined') as declined_assignments,
  array_agg(
    json_build_object(
      'crew_member_id', cm.id,
      'crew_name', cm.name,
      'status', ja.status,
      'role', ja.role,
      'responded_at', ja.responded_at
    )
  ) filter (where ja.id is not null) as assignments
from public.jobs j
left join public.job_assignments ja on ja.job_id = j.id
left join public.crew_members cm on cm.id = ja.crew_member_id
group by j.id;
