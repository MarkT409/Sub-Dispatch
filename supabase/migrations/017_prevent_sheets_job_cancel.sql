-- Stop Sheets sync from wiping the board (cancelled that left mostly Lantana jobs).
-- Blocks cancelling google_sheets jobs; restores recent cancelled sheet rows.

create or replace function public.prevent_google_sheets_job_cancel()
returns trigger
language plpgsql
as $$
begin
  if old.source = 'google_sheets'
     and new.status = 'cancelled'
     and old.status is distinct from 'cancelled' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_google_sheets_job_cancel on public.jobs;
create trigger prevent_google_sheets_job_cancel
  before update on public.jobs
  for each row
  execute function public.prevent_google_sheets_job_cancel();

-- Restore sheet jobs cancelled in the last 30 days
update public.jobs
set status = 'scheduled'
where source = 'google_sheets'
  and status = 'cancelled'
  and work_date >= (current_date - 30);
