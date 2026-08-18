-- Crew portal language preference (English / Español)

alter table public.crew_members
  add column if not exists locale text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crew_members_locale_check'
  ) then
    alter table public.crew_members
      add constraint crew_members_locale_check
      check (locale is null or locale in ('en', 'es'));
  end if;
end $$;

comment on column public.crew_members.locale is
  'Crew UI language: en | es. Null means not chosen yet (show picker on first login).';
