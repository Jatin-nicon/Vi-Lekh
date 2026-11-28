# Design

## Context

See proposal.md (Why) and the delta specs for the required behavior. The current state that shapes the approach:

- **Content model**: a note's HTML is stored as a single block (`htmlToBlocks` returns `[{ id: "doc_root", type: "html" }]`). The existing `computeBlockDiff` and `BlockDiffViewer` (unused today) work per block, so they can't show useful diffs. Diffing has to happen inside the HTML.
- **Rendering**: `HtmlSandboxedViewer` renders into a shadow root using a system font stack (`-apple-system, Segoe UI, Roboto…`), at whatever width the container has. In HTML mode the reader puts one `AnnotationLayer` over the whole document with `pageNumber={1}` and `scale={1.0}`, so stroke coordinates are raw CSS pixels at the current width. That is why they drift.
- **Annotations**: `AnnotationLayer` already supports per-page intrinsic sizes and `scale`, because the PDF path uses them. Storage is localStorage only (`vilekh_annotations_<note>`, `vilekh_pdf_*_<note>_page_<n>`).
- **Export**: the PDF path uses pdf-lib (`exportAnnotatedPdf`) to draw vectors onto the original PDF. The HTML path calls `window.print()` with no annotation layer handling.
- **Versions**: `revisions` holds published and pending rows (`status`: pending, approved, rejected, direct_publish; `base_revision_id`). `notes.current_revision_id` points at the live one. `approveRevision` and `rejectRevision` exist, but nothing in the UI calls them.
- **Identity**: users sign in with Firebase. `createClient()` builds the Supabase browser client from the anon key alone and never sends a user token, so `auth.uid()` and `auth.jwt()` are empty in Postgres. Every permission check (`checkCourseEditAccess`, `saveNoteDirect`) runs in the browser. The repo contains no SQL, so the live schema and policies exist only in the Supabase project.

## Goals / Non-Goals

**Goals:**
- Line breaks that come out the same on every device, so annotations stored in page units stay on their text.
- One layout path shared by screen, editor preview and print.
- Published versions that can't be changed, and privileged actions (publish, merge, fork, restore, review) that run as single atomic database operations enforced in Postgres.
- Reuse `AnnotationLayer` and its tool set unchanged, apart from how coordinates are mapped.

**Non-Goals:**
- Direct-download PDF generation for HTML notes. The browser print engine produces the PDF; server-side headless rendering can come later.
- Moving existing localStorage-only HTML annotations made under the old free-width layout. Their pixel positions can't be mapped reliably. They are kept but not shown (see Migration Plan).
- Character-level merge inside a single paragraph. Merging works per section (top-level element).
- Any change to the PDF viewer or PDF annotation behavior beyond storing it in the account.

## Decisions

### D1. Paginated fixed-width A4 layout ("pages" like a word processor)
`HtmlSandboxedViewer` gains a `paged` mode. The shadow-root content is laid out at **794 × 1123 CSS px** (A4 at 96 dpi), with fixed 72px margins. A pagination pass measures the top-level elements after render. Any element that would cross a page's bottom margin and is shorter than a page gets a spacer added before it, so it starts on the next page. Taller elements are split at the boundary, with the overflow continuing on the next page. Pages appear as separate sheets with gaps. The whole stack is CSS-`transform: scale(s)`'d, where `s = min(1, containerWidth / 794)`, plus a user zoom.

- *Why over a continuous fixed-width column*: annotations, print and PDF all need page boundaries. If the screen shows the same pages, "what you see is what prints" holds by construction.
- *Why over anchoring to text*: the user chose fixed width. Freehand ink across paragraphs can't be anchored to text well.
- Pagination re-runs on content change, after fonts and images load (`document.fonts.ready`, image `load`), and never on container resize. Resizing only changes `s`, so line breaks and page breaks don't move.

### D2. Bundled web font for note content
Ship one self-hosted font family (Source Serif 4 for body, Inter for headings, plus a monospace font) via `@font-face` inside the shadow root. These replace the system font stack as defaults. Without this, Windows (Segoe), macOS (SF) and Android (Roboto) break lines differently and D1 doesn't hold. KaTeX already ships its own fonts.

- Authored HTML that sets its own `font-family` overrides this. That's acceptable, but the editor warns when a non-bundled font is used.

### D2a. Complete HTML documents: one continuous page, adapted at display time
A note may be a full document (`<!doctype html>…`). Its stored HTML is never changed. Per the user's request it is shown with the author's on-screen design as **one continuous page**, not A4 sheets. `prepareDocument` (`src/lib/layout/document-html.ts`) scopes its styles to a wrapper that stands for html/body, resets the app's note styles inside it, evaluates breakpoints and viewport units at a fixed 1104px layout width (then scales to fit, so annotations stay put on every device), maps known web fonts to bundled ones (adds Caveat as "Vi-Lekh Hand"), and drops scripts and handlers. Annotations use one layer in document units under the layout key `html-page` (migration 0003). Save PDF scales the page to the A4 width and cuts it between blocks (`src/lib/pdf/document-slices.ts`). Diff and merge keep the document's head. D1 (A4 pages) still applies to notes written in the app; its paginator now honours `break-after: avoid`, keeps a heading with the whole next block when both fit, and lets sections flow across pages.

Fill-in fields (inputs, text areas) are editable in Read mode and saved on the device (`src/lib/layout/form-fields.ts`). Full screen: `src/components/reader/use-fullscreen.ts`.

- *Alternative*: convert documents on import. Rejected because authors would no longer be editing their own file.
- *Limit*: document scripts don't run. Phones show the desktop layout scaled down, because a reflowing layout would move annotations off their text.

### D3. Annotations reuse the per-page AnnotationLayer
In HTML mode, the reader renders one `AnnotationLayer` per page, with `pageNumber = n`, `intrinsicWidth = 794`, `intrinsicHeight = 1123` and `scale = s × zoom`. This is the same contract the PDF path uses. Stored coordinates are page-local units. The stroke, shape and text-box data types are unchanged.

### D4. HTML export = paginated print with page windows
On export, the reader builds a hidden print container. For each page it holds a 210mm × 297mm sheet with `overflow: hidden`, a clone of the paginated document translated by `-n × 1123px`, and that page's annotation SVG. It then calls `print()` with `@page { size: A4; margin: 0 }` and `break-after: page`. Text stays selectable and vector, annotations are vector SVG, and page breaks match the screen exactly because they are the same pages.

- *Alternative*: rasterize (html2canvas) into pdf-lib. Rejected because text becomes images, files get large, and the output is blurry.
- *Alternative*: server-side Chromium (Puppeteer on Vercel). It would allow a direct download, but it's a heavy deployment and needs authenticated access to annotations. Deferred.

### D5. Separate `note_suggestions` table; `revisions` = published versions only
- `note_suggestions(id, note_id, author_id, base_revision_id, html, attached_annotations jsonb null, summary, status, reviewer_id, reviewer_feedback, result_revision_id, forked_note_id, created_at, updated_at, submitted_at)`. `status` is one of `draft | pending | changes_requested | merged | forked | rejected`. There is a partial unique index on `(note_id, author_id)` where status is `draft` or `changes_requested` (one open draft per note).
- `revisions` gains `version_number int` (unique per note), `source` (`edit | suggestion | restore | fork | legacy`), `restored_from_revision_id`, `suggestion_id`, `merged_by` and `published_annotations jsonb`. Rows are insert-only: no UPDATE or DELETE policy, plus a trigger that rejects updates to `blocks`.
- `notes` gains `forked_from_note_id` and `forked_from_revision_id`.
- Existing `pending` and `rejected` revision rows are moved into `note_suggestions`. Existing `approved` and `direct_publish` rows are numbered by `created_at` and stay in place as `source = 'legacy'`.
- *Why over adding more statuses to `revisions`*: drafts change on every autosave, but published versions must never change. Keeping them in separate tables keeps the RLS rules simple (anyone may write their own suggestion, and nobody may update a revision). A merge that resolves conflicts publishes content that differs from the suggestion, so the suggestion and the published result have to be separate records anyway.

### D6. Privileged actions as SECURITY DEFINER Postgres functions
These run as single transactions, each starting with an authorization check:

| Function | Who | Effect |
|---|---|---|
| `publish_version(note_id, html, summary)` | reviewer | insert revision (next `version_number`, `source='edit'`) and set `notes.current_revision_id` |
| `submit_suggestion(id, summary)` / `withdraw_suggestion(id)` | author | status pending ↔ draft; refuses no-op submissions |
| `merge_suggestion(id, merged_html, publish_annotations bool)` | reviewer | insert revision (`source='suggestion'`, author = contributor, `merged_by` = caller), set current, mark suggestion merged |
| `fork_suggestion(id, title)` | reviewer | insert note in the same module (with `forked_from_*`), insert its v1, mark suggestion forked |
| `review_suggestion(id, action, feedback)` | reviewer | reject, or request changes; feedback is required |
| `restore_version(revision_id)` | reviewer | insert revision copying `blocks` (`source='restore'`, `restored_from_revision_id`) and set current |

The helpers `current_uid()` (`auth.jwt()->>'sub'`), `is_super_admin()` (email claim matches a value in a `app_settings` row, not hard-coded) and `is_course_reviewer(course_id)` live in SQL. `version_number` is assigned under a row lock on the `notes` row, which prevents duplicate numbers when two reviewers publish at once. `saveNoteDirect`, `approveRevision` and `rejectRevision` in `notesService` become thin RPC wrappers.

### D7. Firebase tokens to Supabase (third-party auth)
`createClient()` passes `accessToken: () => auth.currentUser?.getIdToken() ?? null`. Firebase is enabled as a third-party auth provider in the Supabase dashboard. RLS then reads `auth.jwt()->>'sub'`, which is the Firebase uid already used as `profiles.id` and `author_id`. Supabase requires the token to carry `role: "authenticated"`. A Firebase blocking function (or an Admin SDK custom claim) adds it, and the first task verifies this before anything else depends on it.

- *Alternative*: Next.js route handlers that verify the Firebase token with firebase-admin and use the service-role key. Rejected as the default because it means writing an API layer for every write and keeping a service key server-side. RLS keeps the current client-direct architecture.

### D8. Section-level diff and three-way merge
`src/lib/diff/html-diff.ts`:
- `segmentHtml(html)`: parse with `DOMParser`, unwrap single wrapper elements, and return top-level element outerHTML strings, normalized for whitespace and attribute order. Each segment gets a key: its `id` or `data-section-id` when present, otherwise a content hash.
- **Rendered diff**: use jsdiff `diffArrays` over segments. Adjacent removed and added pairs that are similar show as "changed" (a word-level `diffWords` inside). The output renders in the paged viewer with added, removed and changed styling.
- **Source diff**: jsdiff `diffLines` on pretty-printed HTML.
- **Merge**: `node-diff3` `merge(current, base, proposed)` on segment arrays. Clean hunks apply automatically; conflict hunks go to a resolver UI with "Keep current" or "Use suggestion" for each hunk. The client builds `merged_html` and passes it to `merge_suggestion`. The function re-checks that `current_revision_id` hasn't changed since the reviewer loaded it and asks for a reload if it has.
- New contribution snippets carry a `data-section-id` (a uuid) so later edits to them line up as "changed" rather than as a remove plus an add.

### D9. Contributor attribution
The Case Study, My Experience and Findings snippets insert `<section class="vl-contribution" data-section-id data-contributor-id data-contributor-name>`. The reader's sandbox CSS renders "Contributed by …" from `attr(data-contributor-name)`. The attribute lives in HTML, so a contributor could type a false one. The reviewer sees it in the diff, and `merge_suggestion` rewrites any `data-contributor-id` on sections the suggestion added so it matches the suggestion's author.

### D10. Annotation persistence
`annotations(user_id, note_id, layout ('html-a4' | 'pdf'), page_number, revision_id, data jsonb {strokes, shapes, textBoxes}, updated_at)`, with the primary key `(user_id, note_id, layout, page_number)`. RLS allows only the owner. The reader saves to localStorage first (existing keys plus a new `html-a4` key family), then upserts dirty pages to Supabase after 2s of inactivity. On load it merges, using the newer `updated_at` for each page. A sync status chip shows Saved, Saving or Not synced. Attaching annotations to a suggestion copies all of the user's pages for the note into `attached_annotations`. Publishing copies them into `revisions.published_annotations`.

### D11. UI placement
- **Reader** (`note-reader.tsx`): HTML becomes the default view when HTML exists (the PDF/Web switcher stays). Adds the "Suggest edits" button, a "History" slide-over panel, a past-version banner (via the `&version=<revisionId>` query param), and the "Contributor annotations" toggle.
- **Editor** (`/edit`): adds a `mode` of `direct | suggest`, decided by `checkCourseEditAccess`. Suggest mode autosaves to `note_suggestions`, shows any changes-requested feedback, and offers Submit or Discard. New snippets are added to the existing `HtmlNoteEditor` toolbar, and the preview uses the paged viewer.
- **Studio**: a "Reviews" tab with a pending-count badge lists the queue. Opening an item goes to `/review?suggestion=<id>`, which shows the diff modes, annotation overlay, conflict resolver and the four actions.
- **My suggestions**: a user-menu entry that goes to `/suggestions`.
- `BlockDiffViewer` and `computeBlockDiff` are replaced by the new HTML diff and removed, since nothing imports them.

## Risks / Trade-offs

- [Supabase third-party auth needs a `role` claim on Firebase tokens, and enabling RLS may break current reads and writes] → Do the auth spike first (task group 1). Write policies that keep public read access, and test every existing service call against them on a staging Supabase project or branch before turning on RLS in production.
- [The live database's schema and policies are unknown, because nothing is in the repo] → The first migration task dumps the current schema (`supabase db dump --schema-only`) into `supabase/migrations/0000_baseline.sql` before any change.
- [Pagination still differs if the authored HTML uses fonts that aren't bundled, or if browsers render subpixels differently] → Bundle the fonts, add an editor warning for other fonts, and run a stored-layout check. Each annotation set records the page count and a content hash, and a mismatch shows the "made on an older version / layout changed" notice instead of silently drifting.
- [Phones show A4 pages at about 47% scale] → Pinch-zoom and a zoom control (already present for the PDF path). This is the trade-off the user accepted when choosing fixed width.
- [Every version stores the full HTML, including base64 images, so storage grows quickly] → Keep the existing 1200px and compression limits. Note-image storage in a bucket is tracked as an open question; it doesn't change this design's behavior.
- [Elements taller than a page (big tables, long code blocks) are split mid-element] → Accept it, matching browser print. Code, math and images keep `break-inside: avoid` when they fit on one page.
- [Old free-width HTML annotations stop being shown] → Their localStorage keys are not deleted. A one-time notice tells users the layout changed. They were already misaligned.

## Migration Plan

1. Run the auth spike and dump the baseline schema (no user-visible change).
2. Apply migration 0001 (additive): new tables and columns, data copy of pending/rejected rows into `note_suggestions`, version numbering, and the RPC functions. The old code keeps working because the columns are additive.
3. Deploy the client that sends Firebase tokens and calls the RPCs.
4. Apply migration 0002: enable RLS and policies, and drop direct-write grants on `revisions` and `notes.current_revision_id`.
5. Deploy the paged HTML layout, annotations, history, suggestions and review UI.

**Rollback**: steps 2–3 are additive, so you can revert the client and leave the columns in place. Step 4 can be reversed with a down migration that disables the new policies. Migrated suggestion rows keep their original revision ids in `legacy_revision_id` for traceability.

## Open Questions

- Should new note images move from inline base64 to a Supabase storage bucket? That would reduce the size of each version. The behavior stays the same either way, so this can be decided once storage use is measured.
- Should reviewers get notified of new suggestions (email or in-app) beyond the Studio badge? This can be added later without changing this design.
