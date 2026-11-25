-- RECONSTRUCTED baseline: rebuilt from the queries in src/lib, NOT dumped from
-- the live project. Use it only for new environments (staging). Before any
-- production rollout, replace it with `supabase db dump --schema-only`.

create table public.profiles (
  id text primary key, -- Firebase uid
  username text not null,
  display_name text not null,
  avatar_url text,
  role text not null default 'contributor' check (role in ('super_admin','core_team','contributor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  icon text,
  domain text,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  slug text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
create index modules_course_idx on public.modules(course_id);
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  slug text not null,
  title text not null,
  order_index int not null default 0,
  current_revision_id uuid,
  pdf_url text,
  pdf_name text,
  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_course_idx on public.notes(course_id);
create index notes_module_idx on public.notes(module_id);
create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  author_id text not null constraint revisions_author_id_fkey references public.profiles(id),
  base_revision_id uuid references public.revisions(id) on delete set null,
  blocks jsonb not null default '[]',
  pdf_url text,
  pdf_name text,
  change_summary text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected','direct_publish')),
  reviewer_id text constraint revisions_reviewer_id_fkey references public.profiles(id),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index revisions_note_idx on public.revisions(note_id);
alter table public.notes add constraint notes_current_revision_id_fkey
  foreign key (current_revision_id) references public.revisions(id) on delete set null;
create table public.revision_comments (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisions(id) on delete cascade,
  author_id text not null references public.profiles(id),
  block_id text,
  comment text not null,
  created_at timestamptz not null default now()
);
create table public.course_members (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','editor','contributor','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);
create index course_members_user_idx on public.course_members(user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.courses, public.modules,
  public.notes, public.revisions, public.revision_comments, public.course_members to anon, authenticated;

insert into storage.buckets (id, name, public) values ('course-pdfs', 'course-pdfs', true)
  on conflict (id) do nothing;
