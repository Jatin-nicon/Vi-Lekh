-- Asserts for the RPC functions and RLS. Everything is rolled back, by design:
-- the block ends with a deliberate 'ALL TESTS PASSED' exception.
do $t$
declare c uuid; n uuid; v1 uuid; v2 uuid; s uuid; r public.revisions; sg public.note_suggestions; fk public.notes; k int;
  ed text := '{"sub":"t-ed","email":"ed@x.test","email_verified":true}';
  rd text := '{"sub":"t-rd","email":"rd@x.test","email_verified":true}';
  o text := '{"sub":"t-o","email":"o@x.test","email_verified":true}';
  q text; who text;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.profiles (id, username, display_name) values ('t-ed','ed','Ed'), ('t-rd','rd','Rea "D"'), ('t-o','o','Other');
  insert into public.courses (slug, title) values ('t-course','T') returning id into c;
  insert into public.course_members (course_id, user_id, role) values (c,'t-ed','editor');
  insert into public.notes (course_id, slug, title, created_by) values (c,'t','T','t-ed') returning id into n;
  set local role anon; -- tokens without the role claim run as anon

  -- editor publishes v1
  perform set_config('request.jwt.claims', ed, true);
  r := public.publish_version(n, public.html_blocks('<p>one</p>'), 'first'); v1 := r.id;
  assert r.version_number = 1 and r.author_id = 't-ed', 'publish v1';

  -- reader drafts
  perform set_config('request.jwt.claims', rd, true);
  insert into public.note_suggestions (note_id, author_id, base_revision_id, html) values (n,'t-rd',v1,'<p>one</p>') returning id into s;
  begin perform public.submit_suggestion(s,'x'); assert false, 'noop accepted';
  exception when raise_exception then assert sqlerrm = 'No changes to submit', sqlerrm; end;
  update public.note_suggestions set html = '<p>one</p><section class="vl-contribution vl-findings" data-section-id="z" data-contributor-id="t-ed" data-contributor-name="Ed"><h3>F</h3></section>' where id = s;
  insert into public.annotations (user_id, note_id, layout, page_number, data) values ('t-rd', n,'html-a4',1,'{"strokes":[1]}');

  -- draft and annotations are private
  foreach who in array array[o, ed, ''] loop
    perform set_config('request.jwt.claims', who, true);
    select count(*) into k from public.note_suggestions where id = s; assert k = 0, 'draft leaked to ' || who;
    select count(*) into k from public.annotations where note_id = n; assert k = 0, 'annotations leaked to ' || who;
  end loop;

  -- denied direct writes, as the reader and as signed-out
  foreach who in array array[rd, ''] loop
    perform set_config('request.jwt.claims', who, true);
    foreach q in array array[
      format('update public.note_suggestions set status = ''merged'' where id = %L', s),
      format('update public.notes set current_revision_id = %L where id = %L', v1, n),
      format('insert into public.revisions (note_id, author_id, status) values (%L,''t-rd'',''direct_publish'')', n),
      'update public.revisions set blocks = ''[]''',
      format('insert into public.note_suggestions (note_id, author_id, base_revision_id, html) values (%L,''t-o'',%L,''x'')', n, v1),
      format('insert into public.annotations (user_id, note_id, layout, page_number) values (''t-o'',%L,''pdf'',1)', n),
      'insert into public.courses (slug, title, created_by) values (''bad'',''bad'',''t-rd'')',
      format('insert into public.modules (course_id, slug, title) values (%L,''bad'',''bad'')', c),
      format('insert into public.course_members (course_id, user_id, role) values (%L,''t-rd'',''admin'')', c),
      'select * from public.app_settings',
      format('select public.publish_version(%L,''[]'',''x'')', n),
      format('select public.restore_version(%L)', v1),
      format('select public.merge_suggestion(%L,''x'',%L)', s, v1),
      format('select public.fork_suggestion(%L,''x'')', s),
      format('select public.review_suggestion(%L,''reject'',''x'')', s),
      format('select public.attribute_sections(''x'',''x'',''x'')')
    ] loop
      begin execute q; raise exception 'ALLOWED (%): %', who, q using errcode = 'P9999';
      exception when insufficient_privilege then null; end;
    end loop;
  end loop;
  perform set_config('request.jwt.claims', rd, true);
  update public.notes set title = 'hacked' where id = n; get diagnostics k = row_count; assert k = 0, 'note update';
  update public.profiles set role = 'super_admin' where id = 't-rd';
  assert (select role from public.profiles where id = 't-rd') = 'contributor', 'role escalation';
  begin insert into public.note_suggestions (note_id, author_id, base_revision_id, html) values (n,'t-rd',v1,'x'); assert false, 'second draft';
  exception when unique_violation then null; end;

  -- others cannot submit or withdraw it
  perform set_config('request.jwt.claims', o, true);
  begin perform public.submit_suggestion(s,'x'); assert false, 'other submit'; exception when insufficient_privilege then null; end;
  begin perform public.withdraw_suggestion(s); assert false, 'other withdraw'; exception when insufficient_privilege then null; end;

  -- submit, withdraw, submit, request changes, resubmit
  perform set_config('request.jwt.claims', rd, true);
  sg := public.submit_suggestion(s,'sum', true); assert sg.status = 'pending' and jsonb_array_length(sg.attached_annotations) = 1, 'submit';
  update public.note_suggestions set html = 'x' where id = s; get diagnostics k = row_count; assert k = 0, 'pending editable';
  sg := public.withdraw_suggestion(s); assert sg.status = 'draft' and sg.attached_annotations is null, 'withdraw';
  perform public.submit_suggestion(s,'sum', true);
  perform set_config('request.jwt.claims', ed, true);
  select count(*) into k from public.note_suggestions where id = s; assert k = 1, 'reviewer sees pending';
  begin perform public.review_suggestion(s,'reject',' '); assert false, 'empty feedback'; exception when raise_exception then assert sqlerrm = 'Feedback is required', sqlerrm; end;
  sg := public.review_suggestion(s,'request_changes','more'); assert sg.status = 'changes_requested', 'request changes';
  perform set_config('request.jwt.claims', rd, true);
  perform public.submit_suggestion(s,'sum', true);

  -- stale check, then merge with attribution and annotations
  perform set_config('request.jwt.claims', ed, true);
  r := public.publish_version(n, public.html_blocks('<p>two</p>'), 'second'); v2 := r.id;
  begin perform public.merge_suggestion(s,'x',v1); assert false, 'stale merge'; exception when serialization_failure then null; end;
  r := public.merge_suggestion(s, (select html from public.note_suggestions where id = s), v2, true);
  assert r.version_number = 3 and r.author_id = 't-rd' and r.merged_by = 't-ed' and r.source = 'suggestion' and r.published_annotations is not null, 'merge';
  assert public.blocks_html(r.blocks) like '%data-contributor-id="t-rd" data-contributor-name="Rea &quot;D&quot;"%'
    and public.blocks_html(r.blocks) not like '%t-ed%', 'attribution: ' || public.blocks_html(r.blocks);
  assert (select current_revision_id from public.notes where id = n) = r.id, 'merge current';

  -- restore, undo
  r := public.restore_version(v1); assert r.version_number = 4 and r.restored_from_revision_id = v1 and public.blocks_html(r.blocks) = '<p>one</p>', 'restore';
  r := public.restore_version(v2); assert r.version_number = 5, 'undo restore';

  -- fork and reject
  perform set_config('request.jwt.claims', rd, true);
  insert into public.note_suggestions (note_id, author_id, base_revision_id, html) values (n,'t-rd',r.id,'<p>fork</p>') returning id into s;
  perform public.submit_suggestion(s,'f');
  perform set_config('request.jwt.claims', ed, true);
  fk := public.fork_suggestion(s,'T (Rd''s version)');
  assert fk.forked_from_note_id = n and fk.slug = 't-rd-s-version', 'fork';
  assert (select version_number from public.revisions where id = fk.current_revision_id) = 1, 'fork v1';
  perform set_config('request.jwt.claims', rd, true);
  insert into public.note_suggestions (note_id, author_id, base_revision_id, html) values (n,'t-rd',r.id,'<p>rej</p>') returning id into s;
  perform public.submit_suggestion(s,'r');
  perform set_config('request.jwt.claims', ed, true);
  sg := public.review_suggestion(s,'reject','no'); assert sg.status = 'rejected', 'reject';

  -- published content is fixed even for the database owner; deletes still cascade
  reset role;
  begin update public.revisions set blocks = '[]' where id = v1; assert false, 'mutable'; exception when insufficient_privilege then null; end;
  delete from public.notes where id = n;
  -- unverified email is never super admin
  insert into public.app_settings values ('super_admin_email','o@x.test') on conflict (key) do update set value = excluded.value;
  perform set_config('request.jwt.claims', o, true); assert public.is_super_admin(), 'super admin';
  perform set_config('request.jwt.claims', '{"sub":"t-o","email":"o@x.test","email_verified":false}', true);
  assert not public.is_super_admin(), 'unverified super admin';
  raise exception 'ALL TESTS PASSED';
end $t$;
