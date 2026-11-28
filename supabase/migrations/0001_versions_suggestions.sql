-- Additive: versions, suggestions, annotations and the RPC functions (D5, D6, D10).

create table public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security; -- no policies: definer functions only
revoke all on public.app_settings from anon, authenticated;
-- Set per environment, outside version control:
--   insert into app_settings values ('super_admin_email', '<email>');

-- ---------- identity helpers ----------
create function public.current_uid() returns text language sql stable set search_path = '' as
$$ select nullif(auth.jwt()->>'sub', '') $$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_uid() is not null
    and coalesce((auth.jwt()->>'email_verified')::boolean, false)
    and exists (select 1 from public.app_settings
      where key = 'super_admin_email' and lower(value) = lower(auth.jwt()->>'email'))
$$;

create function public.is_course_reviewer(p_course_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_super_admin() or exists (select 1 from public.course_members
    where course_id = p_course_id and user_id = public.current_uid() and role in ('admin','editor'))
$$;

create function public.is_note_reviewer(p_note_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.notes n where n.id = p_note_id and public.is_course_reviewer(n.course_id))
$$;

-- ---------- schema ----------
create table public.note_suggestions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  author_id text not null references public.profiles(id),
  base_revision_id uuid references public.revisions(id) on delete set null,
  html text not null,
  attached_annotations jsonb,
  summary text not null default '' check (char_length(summary) <= 200),
  status text not null default 'draft'
    check (status in ('draft','pending','changes_requested','merged','forked','rejected')),
  reviewer_id text references public.profiles(id),
  reviewer_feedback text,
  result_revision_id uuid references public.revisions(id) on delete set null,
  forked_note_id uuid references public.notes(id) on delete set null,
  legacy_revision_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
create unique index note_suggestions_one_open_draft on public.note_suggestions(note_id, author_id)
  where status in ('draft','changes_requested');
create index note_suggestions_status_idx on public.note_suggestions(status, submitted_at desc);
create index note_suggestions_author_idx on public.note_suggestions(author_id);

alter table public.revisions
  add column version_number int,
  add column source text not null default 'edit' check (source in ('edit','suggestion','restore','fork','legacy')),
  add column restored_from_revision_id uuid references public.revisions(id) on delete set null,
  add column suggestion_id uuid references public.note_suggestions(id) on delete set null,
  add column merged_by text references public.profiles(id),
  add column published_annotations jsonb;
alter table public.notes
  add column forked_from_note_id uuid references public.notes(id) on delete set null,
  add column forked_from_revision_id uuid references public.revisions(id) on delete set null;

create table public.annotations (
  user_id text not null references public.profiles(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  layout text not null check (layout in ('html-a4','pdf')),
  page_number int not null check (page_number > 0),
  revision_id uuid references public.revisions(id) on delete set null,
  page_count int,
  content_hash text,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, note_id, layout, page_number)
);

-- ---------- backfill ----------
update public.revisions set source = 'legacy';
with numbered as (
  select id, row_number() over (partition by note_id order by created_at, id) as n
  from public.revisions where status in ('approved','direct_publish'))
update public.revisions r set version_number = numbered.n from numbered where r.id = numbered.id;
create unique index revisions_note_version on public.revisions(note_id, version_number);

create function public.blocks_html(p_blocks jsonb) returns text language sql immutable set search_path = '' as $$
  select coalesce(string_agg(b->>'content', E'\n' order by i), '')
  from jsonb_array_elements(p_blocks) with ordinality as t(b, i)
$$;
create function public.html_blocks(p_html text) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_array(jsonb_build_object('id','doc_root','type','html','content',p_html))
$$;

insert into public.note_suggestions (note_id, author_id, base_revision_id, html, summary, status,
  reviewer_id, reviewer_feedback, legacy_revision_id, created_at, updated_at, submitted_at)
select note_id, author_id, base_revision_id, public.blocks_html(blocks), left(change_summary, 200), status,
  reviewer_id, reviewer_notes, id, created_at, updated_at, created_at
from public.revisions where status in ('pending','rejected');

-- ---------- triggers ----------
-- Numbers published rows under a lock on the note (also covers the old client).
create function public.revisions_assign_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('approved','direct_publish') and new.version_number is null then
    perform 1 from public.notes where id = new.note_id for update;
    select coalesce(max(version_number), 0) + 1 into new.version_number
      from public.revisions where note_id = new.note_id;
  end if;
  return new;
end $$;
create trigger revisions_assign_version before insert or update on public.revisions
  for each row execute function public.revisions_assign_version();

create function public.revisions_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.blocks is distinct from old.blocks or new.note_id is distinct from old.note_id
     or new.author_id is distinct from old.author_id
     or (old.version_number is not null and new.version_number is distinct from old.version_number) then
    raise exception 'Published versions cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger revisions_immutable before update on public.revisions
  for each row execute function public.revisions_immutable();

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as
$$ begin new.updated_at := now(); return new; end $$;
create trigger note_suggestions_touch before update on public.note_suggestions
  for each row execute function public.touch_updated_at();

-- ---------- functions ----------
create function public.require_note_reviewer(p_note_id uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_note_reviewer(p_note_id) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
end $$;

-- Takes blocks (not html) so notes with PDF metadata blocks keep them.
create function public.publish_version(p_note_id uuid, p_blocks jsonb, p_summary text,
  p_title text default null, p_slug text default null)
returns public.revisions language plpgsql security definer set search_path = '' as $$
declare v public.revisions; cur uuid;
begin
  perform public.require_note_reviewer(p_note_id);
  select current_revision_id into cur from public.notes where id = p_note_id for update;
  insert into public.revisions (note_id, author_id, base_revision_id, blocks, change_summary, status, source)
    values (p_note_id, public.current_uid(), cur, p_blocks, coalesce(p_summary, ''), 'direct_publish', 'edit')
    returning * into v;
  update public.notes set current_revision_id = v.id, title = coalesce(p_title, title),
    slug = coalesce(p_slug, slug), updated_at = now() where id = p_note_id;
  return v;
end $$;

create function public.submit_suggestion(p_id uuid, p_summary text, p_include_annotations boolean default false)
returns public.note_suggestions language plpgsql security definer set search_path = '' as $$
declare s public.note_suggestions; base_html text; ann jsonb;
begin
  select * into s from public.note_suggestions where id = p_id for update;
  if s.id is null or s.author_id is distinct from public.current_uid() then
    raise exception 'Not authorized' using errcode = '42501'; end if;
  if s.status not in ('draft','changes_requested') then raise exception 'This suggestion is not a draft'; end if;
  if coalesce(trim(p_summary), '') = '' then raise exception 'A summary is required'; end if;
  if p_include_annotations then
    select jsonb_agg(jsonb_build_object('layout', layout, 'page_number', page_number, 'data', data)
      order by layout, page_number) into ann
    from public.annotations where note_id = s.note_id and user_id = s.author_id;
  end if;
  select public.blocks_html(blocks) into base_html from public.revisions where id = s.base_revision_id;
  if s.html is not distinct from base_html and ann is null then raise exception 'No changes to submit'; end if;
  update public.note_suggestions set status = 'pending', summary = trim(p_summary),
    attached_annotations = ann, submitted_at = now() where id = p_id returning * into s;
  return s;
end $$;

create function public.withdraw_suggestion(p_id uuid)
returns public.note_suggestions language plpgsql security definer set search_path = '' as $$
declare s public.note_suggestions;
begin
  select * into s from public.note_suggestions where id = p_id for update;
  if s.id is null or s.author_id is distinct from public.current_uid() then
    raise exception 'Not authorized' using errcode = '42501'; end if;
  if s.status <> 'pending' then raise exception 'This suggestion is not pending'; end if;
  begin
    update public.note_suggestions set status = 'draft', attached_annotations = null, submitted_at = null
      where id = p_id returning * into s;
  exception when unique_violation then
    raise exception 'You already have an open draft for this note';
  end;
  return s;
end $$;

-- Locks a pending suggestion's note, then the suggestion, for a reviewer.
create function public.lock_pending_suggestion(p_id uuid)
returns public.note_suggestions language plpgsql security definer set search_path = '' as $$
declare s public.note_suggestions;
begin
  select * into s from public.note_suggestions where id = p_id;
  if s.id is null or not public.is_note_reviewer(s.note_id) then
    raise exception 'Not authorized' using errcode = '42501'; end if;
  perform 1 from public.notes where id = s.note_id for update;
  select * into s from public.note_suggestions where id = p_id for update;
  if s.status <> 'pending' then raise exception 'This suggestion is not pending'; end if;
  return s;
end $$;

-- D9: contribution elements that the suggestion adds (section id not already in
-- the base or current version) are credited to the suggestion's author.
create function public.attribute_sections(p_html text, p_known text, p_author text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare tag text; fixed text; sid text; nm text; out_html text := p_html;
begin
  select display_name into nm from public.profiles where id = p_author;
  nm := replace(replace(replace(replace(coalesce(nm, 'User'), '&','&amp;'), '"','&quot;'), '<','&lt;'), '>','&gt;');
  for tag in select distinct m[1] from regexp_matches(p_html,
      '(<[a-zA-Z](?:[^>"'']|"[^"]*"|''[^'']*'')*>)', 'g') as m
    where m[1] ~* 'vl-contribution'
  loop
    sid := (regexp_match(tag, 'data-section-id\s*=\s*["'']?([^"''\s>]+)', 'i'))[1];
    if sid is not null and strpos(p_known, 'data-section-id="' || sid || '"') > 0 then continue; end if;
    fixed := regexp_replace(tag, '\sdata-contributor-(id|name)\s*=\s*("[^"]*"|''[^'']*''|[^\s>]+)', '', 'gi');
    -- Cut the closing ">" (or "/>") and re-add it; plain concatenation, so "\" in names is safe.
    fixed := regexp_replace(fixed, '\s*/?>$', '') || ' data-contributor-id="' || p_author
      || '" data-contributor-name="' || nm || '">';
    out_html := replace(out_html, tag, fixed);
  end loop;
  return out_html;
end $$;

create function public.merge_suggestion(p_id uuid, p_merged_html text, p_expected_current uuid,
  p_publish_annotations boolean default false)
returns public.revisions language plpgsql security definer set search_path = '' as $$
declare s public.note_suggestions; v public.revisions; cur uuid; known text;
begin
  s := public.lock_pending_suggestion(p_id);
  select current_revision_id into cur from public.notes where id = s.note_id;
  if cur is distinct from p_expected_current then
    raise exception 'The note changed since you opened it. Reload and try again.' using errcode = '40001';
  end if;
  select coalesce(string_agg(public.blocks_html(blocks), E'\n'), '') into known
    from public.revisions where id in (cur, s.base_revision_id);
  insert into public.revisions (note_id, author_id, base_revision_id, blocks, change_summary, status, source,
      suggestion_id, merged_by, published_annotations)
    values (s.note_id, s.author_id, cur,
      public.html_blocks(public.attribute_sections(p_merged_html, known, s.author_id)),
      s.summary, 'approved', 'suggestion', s.id, public.current_uid(),
      case when p_publish_annotations then s.attached_annotations end)
    returning * into v;
  update public.notes set current_revision_id = v.id, updated_at = now() where id = s.note_id;
  update public.note_suggestions set status = 'merged', reviewer_id = public.current_uid(),
    result_revision_id = v.id where id = p_id;
  return v;
end $$;

create function public.fork_suggestion(p_id uuid, p_title text)
returns public.notes language plpgsql security definer set search_path = '' as $$
declare s public.note_suggestions; src public.notes; n public.notes; v public.revisions; known text;
begin
  s := public.lock_pending_suggestion(p_id);
  if coalesce(trim(p_title), '') = '' then raise exception 'A title is required'; end if;
  select * into src from public.notes where id = s.note_id;
  select coalesce(public.blocks_html(blocks), '') into known from public.revisions where id = s.base_revision_id;
  insert into public.notes (course_id, module_id, slug, title, order_index, created_by,
      forked_from_note_id, forked_from_revision_id)
    values (src.course_id, src.module_id,
      trim(both '-' from regexp_replace(lower(trim(p_title)), '[^a-z0-9]+', '-', 'g')),
      trim(p_title), src.order_index + 1, s.author_id, src.id, s.base_revision_id) returning * into n;
  insert into public.revisions (note_id, author_id, blocks, change_summary, status, source, suggestion_id, merged_by)
    values (n.id, s.author_id, public.html_blocks(public.attribute_sections(s.html, coalesce(known, ''), s.author_id)),
      s.summary, 'approved', 'fork', s.id, public.current_uid()) returning * into v;
  update public.notes set current_revision_id = v.id where id = n.id returning * into n;
  update public.note_suggestions set status = 'forked', reviewer_id = public.current_uid(),
    forked_note_id = n.id, result_revision_id = v.id where id = p_id;
  return n;
end $$;

create function public.review_suggestion(p_id uuid, p_action text, p_feedback text)
returns public.note_suggestions language plpgsql security definer set search_path = '' as $$
declare s public.note_suggestions;
begin
  s := public.lock_pending_suggestion(p_id);
  if p_action is null or p_action not in ('reject','request_changes') then raise exception 'Unknown action'; end if;
  if coalesce(trim(p_feedback), '') = '' then raise exception 'Feedback is required'; end if;
  begin
    update public.note_suggestions set reviewer_id = public.current_uid(), reviewer_feedback = trim(p_feedback),
      status = case p_action when 'reject' then 'rejected' else 'changes_requested' end
      where id = p_id returning * into s;
  exception when unique_violation then
    raise exception 'The contributor already has another open draft for this note';
  end;
  return s;
end $$;

create function public.restore_version(p_revision_id uuid)
returns public.revisions language plpgsql security definer set search_path = '' as $$
declare old public.revisions; v public.revisions; cur uuid;
begin
  select * into old from public.revisions where id = p_revision_id and version_number is not null;
  if old.id is null then raise exception 'Not authorized' using errcode = '42501'; end if;
  perform public.require_note_reviewer(old.note_id);
  select current_revision_id into cur from public.notes where id = old.note_id for update;
  insert into public.revisions (note_id, author_id, base_revision_id, blocks, pdf_url, pdf_name, change_summary,
      status, source, restored_from_revision_id)
    values (old.note_id, public.current_uid(), cur, old.blocks, old.pdf_url, old.pdf_name,
      'Restored from v' || old.version_number, 'direct_publish', 'restore', old.id) returning * into v;
  update public.notes set current_revision_id = v.id, updated_at = now() where id = old.note_id;
  return v;
end $$;

-- Internal helpers are not callable through the API.
revoke execute on function public.lock_pending_suggestion(uuid), public.attribute_sections(text,text,text),
  public.require_note_reviewer(uuid), public.revisions_assign_version(), public.revisions_immutable(),
  public.touch_updated_at() from public, anon, authenticated;
grant execute on function public.current_uid(), public.is_super_admin(), public.is_course_reviewer(uuid),
  public.is_note_reviewer(uuid), public.publish_version(uuid,jsonb,text,text,text),
  public.submit_suggestion(uuid,text,boolean), public.withdraw_suggestion(uuid),
  public.merge_suggestion(uuid,text,uuid,boolean), public.fork_suggestion(uuid,text),
  public.review_suggestion(uuid,text,text), public.restore_version(uuid) to anon, authenticated;

-- The new tables have no earlier policies, so they are locked from the start.
alter table public.note_suggestions enable row level security;
alter table public.annotations enable row level security;
revoke all on public.note_suggestions, public.annotations from anon, authenticated;
grant select, delete on public.note_suggestions to anon, authenticated;
grant insert (note_id, author_id, base_revision_id, html, summary) on public.note_suggestions to anon, authenticated;
grant update (html, summary) on public.note_suggestions to anon, authenticated;
grant select, insert, update, delete on public.annotations to anon, authenticated;

create policy suggestions_read on public.note_suggestions for select using (
  author_id = (select public.current_uid()) or (select public.is_super_admin())
  or (status in ('pending','merged','forked','rejected') and public.is_note_reviewer(note_id)));
create policy suggestions_insert on public.note_suggestions for insert with check (
  author_id = (select public.current_uid()) and status = 'draft'
  and exists (select 1 from public.revisions r where r.id = note_suggestions.base_revision_id
    and r.note_id = note_suggestions.note_id and r.version_number is not null));
create policy suggestions_update on public.note_suggestions for update
  using (author_id = (select public.current_uid()) and status in ('draft','changes_requested'))
  with check (author_id = (select public.current_uid()) and status in ('draft','changes_requested'));
create policy suggestions_delete on public.note_suggestions for delete
  using (author_id = (select public.current_uid()) and status in ('draft','changes_requested'));
create policy annotations_owner on public.annotations for all
  using (user_id = (select public.current_uid())) with check (user_id = (select public.current_uid()));
