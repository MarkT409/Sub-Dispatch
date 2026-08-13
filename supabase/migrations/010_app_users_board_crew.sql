-- Link app users to board supervisor rows for stable editing

alter table public.app_users
  add column if not exists board_crew_id uuid references public.board_crews (id) on delete set null;

create unique index if not exists app_users_board_crew_id_uidx
  on public.app_users (board_crew_id)
  where board_crew_id is not null;
