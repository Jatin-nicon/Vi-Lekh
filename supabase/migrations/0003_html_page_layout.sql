-- Annotations on complete HTML documents (one continuous page).
alter table public.annotations drop constraint annotations_layout_check;
alter table public.annotations add constraint annotations_layout_check
  check (layout in ('html-a4','html-page','pdf'));
