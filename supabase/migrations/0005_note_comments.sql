-- Comments on notes (design D6). A thread is its first comment (thread_id null)
-- plus the replies pointing at it. A thread is private to the person who
-- started it and the reviewers of the note's course.
create table public.note_comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  thread_id uuid references public.note_comments(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete cascade,
  -- The published version a thread was started on; replies don't carry one.
  revision_id uuid references public.revisions(id) on delete set null,
  -- { quote, prefix, suffix, path } (D7); null for replies.
  anchor jsonb,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  resolved_at timestamptz,
  resolved_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index note_comments_note_idx on public.note_comments(note_id, created_at);
create index note_comments_thread_idx on public.note_comments(thread_id);
create index note_comments_open_idx on public.note_comments(note_id) where thread_id is null and resolved_at is null;

create trigger note_comments_touch before update on public.note_comments
  for each row execute function public.touch_updated_at();

-- Who started a thread. Definer, so policies on note_comments can use it without recursing.
create function public.comment_thread_author(p_thread_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select author_id from public.note_comments where id = p_thread_id and thread_id is null
$$;

-- Whether the current user may reply in a thread on this note.
create function public.can_reply_to_comment(p_thread_id uuid, p_note_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.note_comments t
    where t.id = p_thread_id and t.thread_id is null and t.note_id = p_note_id
      and (t.author_id = public.current_uid() or public.is_note_reviewer(p_note_id))
  )
$$;

-- Whether a revision is a published version of the note.
create function public.is_published_revision(p_revision_id uuid, p_note_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.revisions r
    where r.id = p_revision_id and r.note_id = p_note_id and r.version_number is not null)
$$;

-- Resolve or reopen a thread: its author or a reviewer of the note.
create function public.set_comment_resolved(p_id uuid, p_resolved boolean)
returns public.note_comments language plpgsql security definer set search_path = '' as $$
declare t public.note_comments;
begin
  select * into t from public.note_comments where id = p_id for update;
  if t.id is null or t.thread_id is not null then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;
  if public.current_uid() is null
     or not (t.author_id = public.current_uid() or public.is_note_reviewer(t.note_id)) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.note_comments
    set resolved_at = case when p_resolved then coalesce(resolved_at, now()) end,
        resolved_by = case when p_resolved then coalesce(resolved_by, public.current_uid()) end
    where id = p_id returning * into t;
  return t;
end $$;

revoke execute on function public.comment_thread_author(uuid), public.can_reply_to_comment(uuid, uuid),
  public.is_published_revision(uuid, uuid), public.set_comment_resolved(uuid, boolean) from public;
grant execute on function public.comment_thread_author(uuid), public.can_reply_to_comment(uuid, uuid),
  public.is_published_revision(uuid, uuid), public.set_comment_resolved(uuid, boolean) to anon, authenticated;

alter table public.note_comments enable row level security;
revoke all on public.note_comments from anon, authenticated;
-- Tokens without a role claim run as anon; policies decide who is signed in.
grant select, delete on public.note_comments to anon, authenticated;
grant insert (note_id, thread_id, author_id, revision_id, anchor, body) on public.note_comments to anon, authenticated;
grant update (body) on public.note_comments to anon, authenticated;

create policy note_comments_read on public.note_comments for select using (
  (select public.current_uid()) is not null and (
    author_id = (select public.current_uid())
    or (thread_id is not null and public.comment_thread_author(thread_id) = (select public.current_uid()))
    or public.is_note_reviewer(note_id)
  )
);

create policy note_comments_add on public.note_comments for insert with check (
  author_id = (select public.current_uid())
  and (
    (thread_id is null and revision_id is not null and public.is_published_revision(revision_id, note_id))
    or (thread_id is not null and anchor is null and public.can_reply_to_comment(thread_id, note_id))
  )
);

create policy note_comments_edit on public.note_comments for update
  using (author_id = (select public.current_uid()))
  with check (author_id = (select public.current_uid()));

create policy note_comments_delete on public.note_comments for delete
  using (author_id = (select public.current_uid()));
