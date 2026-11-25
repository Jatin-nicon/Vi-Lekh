-- Locks the existing tables. Apply after the client sends Firebase tokens and
-- publishes through the RPCs. Policies check the verified token's `sub`, not
-- the Postgres role, so they hold with or without the `role` claim.

-- Non-Super-Admins cannot give themselves a role.
create function public.profiles_guard_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_uid() is null or public.is_super_admin() then return new; end if;
  new.role := case when tg_op = 'INSERT' then 'contributor' else old.role end;
  return new;
end $$;
revoke execute on function public.profiles_guard_role() from public, anon, authenticated;
create trigger profiles_guard_role before insert or update on public.profiles
  for each row execute function public.profiles_guard_role();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.notes enable row level security;
alter table public.revisions enable row level security;
alter table public.revision_comments enable row level security;
alter table public.course_members enable row level security;

revoke all on public.revisions, public.revision_comments, public.notes from anon, authenticated;
grant select on public.revisions, public.notes to anon, authenticated;
grant delete on public.notes to anon, authenticated;
grant insert (course_id, module_id, slug, title, order_index, pdf_url, pdf_name, created_by)
  on public.notes to anon, authenticated;
grant update (module_id, slug, title, order_index, pdf_url, pdf_name, updated_at)
  on public.notes to anon, authenticated;

create policy profiles_read on public.profiles for select using (true);
create policy profiles_insert on public.profiles for insert with check (id = (select public.current_uid()));
create policy profiles_update on public.profiles for update
  using (id = (select public.current_uid()) or (select public.is_super_admin()))
  with check (id = (select public.current_uid()) or (select public.is_super_admin()));

create policy courses_read on public.courses for select using (true);
create policy courses_insert on public.courses for insert
  with check ((select public.is_super_admin()) and created_by = (select public.current_uid()));
create policy courses_update on public.courses for update
  using (public.is_course_reviewer(id)) with check (public.is_course_reviewer(id));
create policy courses_delete on public.courses for delete using ((select public.is_super_admin()));

create policy modules_read on public.modules for select using (true);
create policy modules_insert on public.modules for insert with check (public.is_course_reviewer(course_id));
create policy modules_update on public.modules for update
  using (public.is_course_reviewer(course_id)) with check (public.is_course_reviewer(course_id));
create policy modules_delete on public.modules for delete using (public.is_course_reviewer(course_id));

create policy notes_read on public.notes for select using (true);
create policy notes_insert on public.notes for insert
  with check (public.is_course_reviewer(course_id) and created_by = (select public.current_uid()));
create policy notes_update on public.notes for update
  using (public.is_course_reviewer(course_id)) with check (public.is_course_reviewer(course_id));
create policy notes_delete on public.notes for delete using (public.is_course_reviewer(course_id));

create policy revisions_read on public.revisions for select using (version_number is not null);

create policy members_read on public.course_members for select using (true);
create policy members_insert on public.course_members for insert with check ((select public.is_super_admin()));
create policy members_update on public.course_members for update
  using ((select public.is_super_admin())) with check ((select public.is_super_admin()));
create policy members_delete on public.course_members for delete using ((select public.is_super_admin()));

create policy course_pdfs_write on storage.objects for insert with check (bucket_id = 'course-pdfs'
  and exists (select 1 from public.courses c where c.id::text = (storage.foldername(name))[1]
    and public.is_course_reviewer(c.id)));
create policy course_pdfs_read on storage.objects for select using (bucket_id = 'course-pdfs'
  and exists (select 1 from public.courses c where c.id::text = (storage.foldername(name))[1]
    and public.is_course_reviewer(c.id)));
create policy course_pdfs_update on storage.objects for update using (bucket_id = 'course-pdfs'
  and exists (select 1 from public.courses c where c.id::text = (storage.foldername(name))[1]
    and public.is_course_reviewer(c.id)));
