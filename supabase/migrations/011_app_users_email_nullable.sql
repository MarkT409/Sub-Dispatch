-- Allow supervisor/staff accounts without email (phone or board link only)

alter table public.app_users
  alter column email drop not null;
