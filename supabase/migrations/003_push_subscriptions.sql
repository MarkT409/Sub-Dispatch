-- Push notification subscriptions for admin PWA devices

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

drop policy if exists "Authenticated users can manage push_subscriptions"
  on public.push_subscriptions;
create policy "Authenticated users can manage push_subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (true)
  with check (true);
