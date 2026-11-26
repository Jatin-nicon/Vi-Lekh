# Tasks

## 1. Auth spike and baseline schema (D7, Migration step 1)

- [ ] 1.1 Dump the live Supabase schema and policies into `supabase/migrations/0000_baseline.sql` (`supabase db dump --schema-only`) and verify the file lists the `notes`, `revisions`, `profiles`, `courses`, `modules` and `course_members` tables
- [ ] 1.2 Enable Firebase as a third-party auth provider on a staging Supabase project or branch, and add the `role: "authenticated"` claim (blocking function or custom claim). Document the steps in `docs/auth-setup.md` and verify that `select auth.jwt()->>'sub'` run through the client returns the Firebase uid
- [ ] 1.3 Pass `accessToken` (Firebase ID token) in `src/lib/supabase/client.ts` and verify that every existing page (catalog, reader, Studio, editor) still loads and saves against staging with no new errors

## 2. Test tooling and dependencies

- [x] 2.1 Add `vitest` and `jsdom` dev dependencies, a `test` script and `vitest.config.ts`, and verify `npm test` runs with a placeholder test passing
- [x] 2.2 Add the `diff` and `node-diff3` dependencies plus the self-hosted Source Serif 4, Inter and monospace fonts under `public/fonts/`, and verify `npm run build` succeeds

## 3. Database: versions, suggestions, annotations (D5, D6, D10)

- [ ] 3.1 Write `supabase/migrations/0001_versions_suggestions.sql`: the `note_suggestions` table with its one-open-draft partial unique index; the new `revisions` columns, with `version_number` backfilled by `created_at` per note and existing rows set to `source='legacy'`; the `notes.forked_from_*` columns; the `annotations` table; an `app_settings` row for the Super Admin email; and a copy of pending and rejected revisions into `note_suggestions` keeping `legacy_revision_id`. Verify by applying it to staging and checking row counts before and after
- [x] 3.2 Add the SQL helpers `current_uid()`, `is_super_admin()` and `is_course_reviewer(course_id)`, and the functions `publish_version`, `submit_suggestion`, `withdraw_suggestion`, `merge_suggestion`, `fork_suggestion`, `review_suggestion` and `restore_version`, with a row lock for `version_number` and the stale-current check in `merge_suggestion`. Verify with `supabase/tests/rpc_rls.sql` (pgTAP or plain asserts) covering success and permission failure for each function
- [x] 3.3 Add a trigger rejecting updates to `revisions.blocks` and verify that an UPDATE on a published revision fails on staging
- [x] 3.4 Write `supabase/migrations/0002_rls.sql`, with policies keeping public read access for courses, modules, notes and published revisions; owner-only access for drafts and annotations; reviewer read access for pending suggestions in their courses; and no direct writes to `revisions` or `notes.current_revision_id`. Verify with `supabase/tests/rpc_rls.sql` covering each access-control scenario (forged merge, unauthenticated write, writing as another user, a reader reading someone else's draft)
- [ ] 3.5 Update `src/lib/supabase/types.ts` with the `Suggestion`, `SuggestionStatus`, `RevisionSource`, `AnnotationRecord` types and the new columns, and verify `npx tsc --noEmit` passes

## 4. Service layer

- [ ] 4.1 Turn `saveNoteDirect`, `approveRevision` and `rejectRevision` into RPC wrappers (`publish_version`, `merge_suggestion`, `review_suggestion`) without changing their callers' signatures, and verify that editor publishing still works on staging
- [ ] 4.2 Add the suggestion methods `getOrCreateDraft`, `saveDraft`, `submitSuggestion`, `withdrawSuggestion`, `discardDraft`, `getMySuggestions`, `getReviewQueue`, `getSuggestion`, `mergeSuggestion`, `forkSuggestion`, `rejectSuggestion` and `requestChanges`, and verify them with vitest tests using a mocked Supabase client
- [ ] 4.3 Add the version methods `getVersionHistory(noteId)`, `getVersion(revisionId)` and `restoreVersion(revisionId)` and the annotation methods `loadAnnotations`, `saveAnnotationPages` and `snapshotAnnotations`, and verify them with vitest tests using a mocked client

## 5. Paged A4 HTML layout (D1, D2; note-editor "Isolated HTML document and print rendering")

- [x] 5.1 Add `paged` mode to `HtmlSandboxedViewer`: 794×1123 pages, 72px margins, bundled `@font-face` inside the shadow root, and a `transform: scale` fit with a zoom prop. Verify that at window widths of 1440 and 390 the computed line breaks of a sample note are identical (a script in `scripts/` comparing `Range.getClientRects` line tops)
- [x] 5.2 Implement the pagination pass in `src/lib/layout/paginate.ts` (spacers before elements that cross a page boundary, splitting elements taller than a page, re-running after fonts and images load, not on resize) and export `pageCount`. Verify with vitest and jsdom tests using stubbed element heights
- [x] 5.3 Use the paged viewer in the reader HTML view and the editor preview, make HTML the default view when HTML exists, and verify by hand that the PDF/Web switcher and the PDF viewer behave as before
- [x] 5.4 Add an editor warning when authored HTML sets a `font-family` that isn't bundled, and verify that it appears for `font-family: Arial` and not for the default font
- [x] 5.5 Render complete HTML documents without changing the stored HTML (D2a). Verify with `document-html.test.ts` and by checking that the 12 AI Crafting lessons on staging show as one continuous page matching the original files, and that Save PDF loses no text
- [x] 5.6 Full-screen reading (button, F, Esc), fill-in fields saved on the device, and handwriting text boxes. Verify in Chrome on the web and PDF views, and that all fields in the 12 lessons accept typing

## 6. HTML annotations: per-page, account-synced (D3, D10; note-annotations deltas)

- [x] 6.1 Render one `AnnotationLayer` per HTML page with an intrinsic size of 794×1123 and `scale = fit × zoom`, using the new `vilekh_html_a4_*` localStorage keys. Verify by hand that strokes stay on their text when resizing from desktop to 390px wide and when changing the zoom
- [ ] 6.2 Add debounced (2s) account sync with per-page `updated_at` merging, a Saved, Saving or Not synced chip, and an upload after sign-in. Verify that annotations drawn in one browser profile appear in a second profile signed in as the same user
- [ ] 6.3 Store `revision_id`, page count and content hash with each annotation set, and show the "made on v<N>" notice on mismatch. Verify by annotating, publishing an edit, and reloading
  - Done: revision, page count and content hash are stored per page, and the notice shows with Dismiss (checked in two browser profiles with stubbed account calls). Left: the "view v<N>" option, which needs past-version viewing (11.2), and a check on the live site after a real publish.
- [ ] 6.4 Show the one-time "layout changed" notice when legacy `vilekh_annotations_<note>` keys exist, without deleting them, and verify the keys are still present after dismissing it
- [ ] 6.5 Update the "Annotation & History Architecture" section of `README.md` to describe page-unit coordinates, account sync and version history, and verify the README renders

## 7. HTML PDF export (D4)

- [x] 7.1 Build the print-container export in `src/lib/pdf/html-print-export.ts` (per-page 210×297mm windows with the translated document clone and that page's annotation SVG, `@page { size: A4; margin: 0 }`) and wire it to the reader's export button in HTML mode. Verify by hand that Chrome "Save as PDF" produces the same page count and breaks as on screen, with selectable text and vector ink, and that an annotation crossing a page boundary appears split across both pages
- [ ] 7.2 Check the export in Firefox and Safari (or Edge) and record the results in `docs/html-export.md`, and verify the doc lists the browser versions and any differences found

## 8. HTML diff and three-way merge (D8)

- [x] 8.1 Implement `segmentHtml`, `diffSegments` (with "changed" pairing and word diff) and `diffSource` in `src/lib/diff/html-diff.ts`. Verify with vitest tests: an added section, a removed section, a changed paragraph, a wrapper div being unwrapped, and attribute-order normalization
- [x] 8.2 Implement `mergeSegments(base, current, proposed)` returning clean output or conflict hunks, plus `resolveConflicts`. Verify with vitest tests: non-overlapping edits merge cleanly, an edit on the same section conflicts, and keep-current or use-suggestion resolution produces the expected HTML
- [ ] 8.3 Build a `HtmlDiffViewer` component (rendered mode in the paged viewer with added, removed and changed styling, and a source mode with line diff), remove the unused `BlockDiffViewer` and `computeBlockDiff`, and verify that `npx tsc --noEmit` and `npm run lint` pass

## 9. Suggest-edit flow (note-contributions; note-editor route authorization)

- [ ] 9.1 Add the "Suggest edits" button to the reader (and a sign-in prompt for signed-out visitors), and verify that it shows for a non-editor and also shows next to Edit for an editor
- [ ] 9.2 Add `mode: direct | suggest` to `/edit`, with a suggest banner, draft load or resume, 2s autosave, Discard (with confirmation), changes-requested feedback shown at the top, and no publish control. Verify that a non-editor can edit, leave and resume a draft and that the published note is unchanged
- [x] 9.3 Add the Case Study, My Experience and Findings snippets (`section.vl-contribution` with `data-section-id` and contributor attributes) and a toolbar Image action using `uploadImage`, with print and reader styling and the "Contributed by" label. Verify by inserting each one, previewing, and printing
- [ ] 9.4 Build the submit dialog (required summary of 200 characters or fewer, "Include my annotations" checkbox, "No changes to submit" refusal) and the Withdraw action, and verify the status moves draft → pending → draft
- [ ] 9.5 Add the `/suggestions` page linked from the user menu, listing the user's suggestions with their status and feedback, and verify each status shows correctly using seeded rows

## 10. Review queue and actions in Studio (note-contributions)

- [ ] 10.1 Add a Studio "Reviews" tab with a pending-count badge, limited to the courses the user reviews and with the "Outdated base" badge. Verify that an editor of course X sees only course X items
- [ ] 10.2 Build `/review?suggestion=<id>` with rendered and source diff, a toggleable overlay of attached annotations, and the contributor, summary and base version details. Verify by opening a seeded suggestion
- [ ] 10.3 Implement Merge (direct, or through the conflict resolver when stale, with a "Publish annotations" checkbox and reload-on-concurrent-change). Verify: merging onto an unchanged note creates a new current version credited to the contributor, and a stale merge blocks until every conflict is resolved
- [ ] 10.4 Implement "Save as separate copy" (editable default title, links in both directions, a "Copies of this note" link on the original), and verify that the new note opens with v1 equal to the proposed HTML and the original is unchanged
- [ ] 10.5 Implement Reject and Request changes with required feedback, and verify that a request-changes suggestion reopens as an editable draft for the contributor with the feedback shown

## 11. Version history and restore (note-version-history)

- [ ] 11.1 Add the History slide-over in the reader (versions newest first with number, date, author, merged-by, summary, source label and the current marker), and verify it against a note with direct-edit, suggestion and restore versions
- [ ] 11.2 Add past-version viewing via `&version=<id>` (banner, Back to current, annotation tools disabled) and "Compare" using `HtmlDiffViewer`, and verify that viewing v2 and comparing v2 with the current version work
- [ ] 11.3 Add "Restore this version" (reviewers only, with a confirmation) calling `restore_version`, and verify that restoring v3 from v5 creates v6 marked "Restored from v3", that v4 and v5 remain, that restoring v5 again creates v7, and that a pending suggestion stays queued with "Outdated base"
- [ ] 11.4 Add the "Contributor annotations" toggle (off by default, read-only, drawn under the reader's own annotations) for versions with `published_annotations`, and verify it after merging a suggestion with published annotations

## 12. Rollout and end-to-end checks

- [ ] 12.1 Apply migration 0002 (RLS) on staging and run the full flow: a reader suggests with a case study, an image and annotations → an editor reviews → merge → history → restore → fork → reject. Extend `scripts/verify-e2e.ts` to script this and verify it passes
- [ ] 12.2 Write the production rollout checklist (the Migration Plan order, the Firebase claim setup, the RLS down-migration for rollback) in `docs/rollout-html-contributions.md`, and verify that every migration referenced exists in `supabase/migrations/`

## Workflow follow-up

- Archive the change with `/opsx:archive` once implementation is reviewed and deployed.
