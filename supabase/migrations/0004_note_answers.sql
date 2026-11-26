-- Readers' answers to the fill-in fields in a note, per user and note.
-- `answers` maps a field key to { "v": value, "t": ISO time of the last change },
-- so devices can merge field by field.
create table public.note_answers (
  user_id text not null references public.profiles(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  answers jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, note_id)
);

alter table public.note_answers enable row level security;
revoke all on public.note_answers from anon, authenticated;
grant select, insert, update, delete on public.note_answers to anon, authenticated;

create policy note_answers_owner on public.note_answers for all
  using (user_id = (select public.current_uid())) with check (user_id = (select public.current_uid()));
