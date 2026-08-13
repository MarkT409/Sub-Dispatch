-- Phone numbers for admin portal OTP login

alter table public.app_users
  add column if not exists phone text;

create index if not exists app_users_phone_idx
  on public.app_users (phone)
  where phone is not null;
