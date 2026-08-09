-- Migration: job board Sheets sync columns (run in Supabase SQL editor if jobs table already exists)

alter table public.jobs
  add column if not exists work_date date,
  add column if not exists crew_lead text,
  add column if not exists assigned_to text,
  add column if not exists work_kind text,
  add column if not exists plan_sqft text,
  add column if not exists sheets_row_key text,
  add column if not exists sheets_week text,
  add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_work_kind_check'
  ) then
    alter table public.jobs
      add constraint jobs_work_kind_check
      check (work_kind is null or work_kind in ('rough', 'trim', 'unknown'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'jobs_source_check'
  ) then
    alter table public.jobs
      add constraint jobs_source_check
      check (source in ('manual', 'google_sheets'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'jobs_sheets_row_key_key'
  ) then
    alter table public.jobs
      add constraint jobs_sheets_row_key_key unique (sheets_row_key);
  end if;
end $$;

create index if not exists jobs_work_date_idx on public.jobs (work_date desc nulls last);
create index if not exists jobs_sheets_week_idx on public.jobs (sheets_week);
