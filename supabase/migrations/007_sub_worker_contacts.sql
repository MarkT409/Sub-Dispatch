-- Contact info + lead flag for Crew-tab workers

alter table public.sub_workers
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists is_lead boolean not null default false;

create index if not exists sub_workers_is_lead_idx
  on public.sub_workers (team_id, is_lead)
  where is_lead = true;
