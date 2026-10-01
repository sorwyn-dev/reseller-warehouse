-- Сессии Telegram-бота: какая коробка активна в каком чате

create table if not exists public.bot_sessions (
  chat_id bigint primary key,
  active_box_id uuid references public.boxes (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.bot_sessions enable row level security;

drop policy if exists "bot_sessions_all" on public.bot_sessions;
create policy "bot_sessions_all" on public.bot_sessions
  for all using (true) with check (true);
