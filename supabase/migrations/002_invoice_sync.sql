-- Migration: Lantana invoice sync columns

alter table public.jobs
  add column if not exists plan_name text,
  add column if not exists invoice_gross numeric(12, 2),
  add column if not exists invoice_payout numeric(12, 2),
  add column if not exists invoice_profit numeric(12, 2),
  add column if not exists invoice_row_key text,
  add column if not exists invoice_week text;

-- Relax work_kind to allow service
alter table public.jobs drop constraint if exists jobs_work_kind_check;
alter table public.jobs
  add constraint jobs_work_kind_check
  check (work_kind is null or work_kind in ('rough', 'trim', 'service', 'unknown'));

-- Allow invoice source
alter table public.jobs drop constraint if exists jobs_source_check;
alter table public.jobs
  add constraint jobs_source_check
  check (source in ('manual', 'google_sheets', 'invoice'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_invoice_row_key_key'
  ) then
    alter table public.jobs
      add constraint jobs_invoice_row_key_key unique (invoice_row_key);
  end if;
end $$;

create index if not exists jobs_invoice_week_idx on public.jobs (invoice_week);
create index if not exists jobs_site_address_idx on public.jobs (site_address);
