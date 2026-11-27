-- Asserts for note comments (0005). Everything is rolled back, by design:
-- the block ends with a deliberate 'ALL TESTS PASSED' exception.
do $t$
declare c uuid; c2 uuid; n uuid; n2 uuid; v1 uuid; t1 uuid; t2 uuid; rp uuid; k int; r public.note_comments;
  ed text := '{"sub":"t-ed","email":"ed@x.test","email_verified":true}';   -- editor of course c
  ed2 text := '{"sub":"t-ed2","email":"ed2@x.test","email_verified":true}'; -- editor of course c2 only
  rd text := '{"sub":"t-rd","email":"rd@x.test","email_verified":true}';   -- commenter
  o text := '{"sub":"t-o","email":"o@x.test","email_verified":true}';      -- another reader
  who text;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.profiles (id, username, display_name) values
    ('t-ed','ed','Ed'), ('t-ed2','ed2','Ed2'), ('t-rd','rd','Rea'), ('t-o','o','Other');
  insert into public.courses (slug, title) values ('t-course','T') returning id into c;
  insert into public.courses (slug, title) values ('t-course2','T2') returning id into c2;
  insert into public.course_members (course_id, user_id, role) values (c,'t-ed','editor'), (c2,'t-ed2','editor');
  insert into public.notes (course_id, slug, title, created_by) values (c,'t','T','t-ed') returning id into n;
  insert into public.notes (course_id, slug, title, created_by) values (c2,'t2','T2','t-ed2') returning id into n2;
  set local role anon; -- tokens without the role claim run as anon

  perform set_config('request.jwt.claims', ed, true);
  v1 := (public.publish_version(n, public.html_blocks('<p>one</p>'), 'first')).id;

  -- a reader comments on the published version
  perform set_config('request.jwt.claims', rd, true);
  insert into public.note_comments (note_id, author_id, revision_id, anchor, body)
    values (n, 't-rd', v1, '{"quote":"one"}', 'Add an example?') returning id into t1;

  -- empty, too long, someone else's name, no version: refused
  begin insert into public.note_comments (note_id, author_id, revision_id, body) values (n,'t-rd',v1,'   ');
    assert false, 'empty comment accepted'; exception when check_violation then null; end;
  begin insert into public.note_comments (note_id, author_id, revision_id, body) values (n,'t-rd',v1,repeat('x',2001));
    assert false, 'long comment accepted'; exception when check_violation then null; end;
  begin insert into public.note_comments (note_id, author_id, revision_id, body) values (n,'t-o',v1,'spoof');
    assert false, 'spoofed author accepted'; exception when insufficient_privilege then null; end;
  begin insert into public.note_comments (note_id, author_id, body) values (n,'t-rd','no version');
    assert false, 'comment without a version accepted'; exception when insufficient_privilege then null; end;
  begin insert into public.note_comments (note_id, author_id, revision_id, body) values (n2,'t-rd',v1,'wrong note');
    assert false, 'version of another note accepted'; exception when insufficient_privilege then null; end;
  -- resolved columns can't be set directly
  begin insert into public.note_comments (note_id, author_id, revision_id, body, resolved_at) values (n,'t-rd',v1,'x',now());
    assert false, 'resolved_at insert accepted'; exception when insufficient_privilege then null; end;

  -- signed out can't comment
  perform set_config('request.jwt.claims', '', true);
  begin insert into public.note_comments (note_id, author_id, revision_id, body) values (n,'t-rd',v1,'anon');
    assert false, 'signed-out comment accepted'; exception when insufficient_privilege or not_null_violation then null; end;

  -- visibility: author and reviewer see it; another reader, another course's editor and signed out don't
  foreach who in array array[rd, ed] loop
    perform set_config('request.jwt.claims', who, true);
    select count(*) into k from public.note_comments where id = t1; assert k = 1, 'thread hidden from ' || who;
  end loop;
  foreach who in array array[o, ed2, ''] loop
    perform set_config('request.jwt.claims', who, true);
    select count(*) into k from public.note_comments where note_id = n; assert k = 0, 'thread leaked to ' || who;
  end loop;

  -- replies: reviewer and author can; another reader can't
  perform set_config('request.jwt.claims', ed, true);
  insert into public.note_comments (note_id, thread_id, author_id, body) values (n, t1, 't-ed', 'Good idea') returning id into rp;
  perform set_config('request.jwt.claims', rd, true);
  insert into public.note_comments (note_id, thread_id, author_id, body) values (n, t1, 't-rd', 'Thanks');
  select count(*) into k from public.note_comments where thread_id = t1; assert k = 2, 'author sees replies: ' || k;
  perform set_config('request.jwt.claims', o, true);
  begin insert into public.note_comments (note_id, thread_id, author_id, body) values (n, t1, 't-o', 'me too');
    assert false, 'outsider reply accepted'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims', ed2, true);
  begin insert into public.note_comments (note_id, thread_id, author_id, body) values (n, t1, 't-ed2', 'x');
    assert false, 'other course editor reply accepted'; exception when insufficient_privilege then null; end;
  -- a reply must be in the same note
  perform set_config('request.jwt.claims', rd, true);
  begin insert into public.note_comments (note_id, thread_id, author_id, body) values (n2, t1, 't-rd', 'x');
    assert false, 'reply on another note accepted'; exception when insufficient_privilege then null; end;

  -- edit and delete own only
  update public.note_comments set body = 'Add a worked example?' where id = t1;
  select body into r.body from public.note_comments where id = t1; assert r.body = 'Add a worked example?', 'own edit';
  update public.note_comments set body = 'hijack' where id = rp; -- the reviewer's reply: no rows
  perform set_config('request.jwt.claims', ed, true);
  select body into r.body from public.note_comments where id = rp; assert r.body = 'Good idea', 'edited another''s reply';
  delete from public.note_comments where id = t1; -- not the reviewer's to delete
  select count(*) into k from public.note_comments where id = t1; assert k = 1, 'deleted another''s comment';
  perform set_config('request.jwt.claims', rd, true);
  begin update public.note_comments set resolved_at = now() where id = t1;
    assert false, 'resolved_at update accepted'; exception when insufficient_privilege then null; end;

  -- resolve and reopen: author or reviewer only
  perform set_config('request.jwt.claims', o, true);
  begin perform public.set_comment_resolved(t1, true); assert false, 'outsider resolved';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims', ed, true);
  r := public.set_comment_resolved(t1, true);
  assert r.resolved_at is not null and r.resolved_by = 't-ed', 'reviewer resolves';
  perform set_config('request.jwt.claims', rd, true);
  r := public.set_comment_resolved(t1, false);
  assert r.resolved_at is null and r.resolved_by is null, 'author reopens';
  begin perform public.set_comment_resolved(rp, true); assert false, 'reply resolved';
  exception when no_data_found then null; end;

  -- deleting a thread removes its replies
  perform set_config('request.jwt.claims', rd, true);
  insert into public.note_comments (note_id, author_id, revision_id, body) values (n, 't-rd', v1, 'Second') returning id into t2;
  delete from public.note_comments where id = t1;
  perform set_config('request.jwt.claims', ed, true);
  select count(*) into k from public.note_comments where note_id = n; assert k = 1, 'replies left after delete: ' || k;

  raise exception 'ALL TESTS PASSED';
end $t$;
