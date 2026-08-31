-- Soft-dismiss admin "Crew responses" notifications without deleting assignments.

alter table public.job_assignments
  add column if not exists admin_dismissed_at timestamptz;

create index if not exists job_assignments_admin_dismissed_idx
  on public.job_assignments (admin_dismissed_at)
  where admin_dismissed_at is null;
