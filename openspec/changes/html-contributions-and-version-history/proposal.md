# Proposal

## Why

The HTML version of a note should be the main working format, but it is not dependable yet. Annotations made on it drift away from the text whenever the layout width changes (on another screen size, a phone, or a print page), and its PDF export is a plain `window.print()` that does not line up with what the reader saw. Readers also have no way to add to a note, such as text, images, or a case study with their own experience and findings, and admins have no way to review those additions, merge them, keep them as a separate copy, or roll back to an earlier version.

## What Changes

- **HTML page layout**: the reader renders HTML notes at a fixed A4 page width and scales the page to fit the screen. Annotation coordinates are stored in that fixed page space, so marks stay on the text at any screen size and in print.
- **Annotation storage**: annotations are saved to the user's account (Supabase), tied to the note version they were drawn on. localStorage stays as an offline cache. They stay private to the user unless the user chooses to include them in a suggestion.
- **Annotated HTML → PDF export**: exporting an annotated HTML note produces a PDF whose page breaks and annotation positions match the on-screen page.
- **Suggest edits**: any signed-in user can open a working copy of a note's HTML. They can add or change text, add images, and insert ready-made sections (Case Study, My Experience, Findings). They can optionally attach their annotations and submit the result for review. Drafts are saved so they can resume later.
- **Review queue in Studio**: course admins, course editors and the Super Admin see the pending suggestions for their courses, with a rendered and source diff against the base version. They can:
  - **Merge into the current note**: if the note changed since the suggestion was started, changes that don't overlap merge automatically, and overlapping ones are shown for the reviewer to choose between.
  - **Save as a separate copy**: create a new note in the same module, linked to the original.
  - **Reject with feedback**, or **request changes**, which sends the suggestion back to the contributor.
- **Version history**: every published version is kept and listed with its author, date, summary and source (direct edit, merged suggestion, restore). Users can view and compare any two versions. A **one-click Restore** publishes an old version as a new version, so nothing is ever deleted or overwritten.
- **Real database identity (security)**: the Supabase client will send the signed-in Firebase user's token (Supabase third-party auth), and Row Level Security will enforce who can submit, review, merge, fork and restore. Today these checks run only in the browser, which is not safe once every signed-in user can write suggestions.
- The PDF viewer, PDF upload and PDF annotations stay as they are. The PDF/Web switcher stays, but HTML becomes the default view when a note has HTML content.

## Capabilities

### New Capabilities
- `note-contributions`: suggest-edit drafts, contribution sections (text, image, case study, findings), submission, the review queue, diffs, and the merge, separate-copy, reject and request-changes outcomes.
- `note-version-history`: the per-note version timeline, viewing and comparing versions, and non-destructive one-click restore.

### Modified Capabilities
- `note-annotations`: browser-only caching becomes account-backed storage tied to a version. Adds fixed-width HTML page annotation and the annotated HTML PDF export.
- `note-editor`: replaces "direct unconstrained layout" with the fixed A4 page layout. The editor gains a suggest mode for non-editors plus the new contribution snippets.
- `access-control`: general readers may now create suggestion drafts and submissions (but still cannot publish). RLS rules use the real user identity and cover the new review and restore actions.

## Impact

- **Code**: `src/components/reader/note-reader.tsx`, `annotation-layer.tsx`, `html-sandboxed-viewer.tsx`, `src/app/edit/page.tsx`, `html-note-editor.tsx`, `src/app/studio/page.tsx`, `src/lib/data/notes-service.ts`, `src/lib/diff/*`, `src/components/diff/block-diff-viewer.tsx` (currently unused), `src/lib/supabase/client.ts`, `src/lib/supabase/types.ts`, `globals.css` print rules. New: a version history panel, a review page, an HTML diff/merge utility, and an HTML PDF export module.
- **Database**: new `note_suggestions` table (drafts and submissions) and `annotations` table. `revisions` becomes published-only and immutable, gaining `version_number`, `source`, `restored_from_revision_id`, `suggestion_id` and `published_annotations`. `notes` gains `forked_from_note_id` and `forked_from_revision_id`. Privileged actions move into database functions, and RLS policies are added. The repo has no migrations yet, so this adds `supabase/migrations/`.
- **External setup**: Firebase must be enabled as a third-party auth provider in the Supabase project dashboard (a manual step for the project owner).
- **Dependencies**: `diff` (jsdiff) for the source and section diffs, and `node-diff3` for the three-way merge. Also a bundled web font, so text lays out identically on every device.
- **Not in scope**: removing the PDF viewer, real-time co-editing, inline comment threads on suggestions, and converting PDF-only notes to HTML.
