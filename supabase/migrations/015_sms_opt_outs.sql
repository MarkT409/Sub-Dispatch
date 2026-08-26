-- Track SMS STOP / START opt-outs by phone (Twilio inbound replies).

create table if not exists public.sms_opt_outs (
  phone_e164 text primary key,
  opted_out_at timestamptz not null default now(),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sms_opt_outs enable row level security;

drop policy if exists "Service role manages sms_opt_outs" on public.sms_opt_outs;
create policy "Service role manages sms_opt_outs"
  on public.sms_opt_outs for all
  using (true)
  with check (true);
