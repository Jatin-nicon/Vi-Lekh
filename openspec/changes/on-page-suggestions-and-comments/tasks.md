# Tasks

## 1. Source mapping and splicing (D1, D2)

- [x] 1.1 Add `parse5` as a direct dependency and verify `npm run build` succeeds and the client bundle loads it only on the edit page
- [x] 1.2 Write `src/lib/editor/source-map.ts`: parse a draft with source locations, compute a rendered element's child-index path (skipping `[data-vl-page-spacer]` and `[data-vl-overlay]`), resolve it in the source tree (skipping the elements `prepareDocument` removes, for documents), and check tag and text. Verify with vitest tests on a fragment, a complete document with head styles, and an A4 note with spacers
- [x] 1.3 Add `replaceInner(source, element, html)` and `insertAfter(source, element, html)` that splice by offsets. Verify with vitest that every character outside the edited range is unchanged for all 12 imported lessons, and that `diffSegments` reports exactly one changed segment after a one-paragraph edit
- [x] 1.4 Add the inline clean-up for edited markup (allowed inline tags, no event attributes or scripts, http(s)/mailto links only). Verify with vitest cases for pasted styles, `<script>`, `onclick` and `javascript:` links

## 2. Page view and in-place editing (D3, D4, D5)

- [x] 2.1 Add an edit mode to `HtmlSandboxedViewer`: pick the nearest editable text block on click, make only it `contenteditable`, insert line breaks on Enter and plain text on paste, and report the committed inner HTML on blur; fields and links stay inert. Verify in Chrome on an imported lesson and an A4 note that a paragraph edit commits and illustrations are not editable
- [x] 2.2 Make the Page view the only view in suggest mode (remove the code view and preview there), wired to the source splicing and the 2s autosave. Verify that suggest mode shows no code editor, that an edit is saved to the draft, and that the direct-publish editor still has its code view
- [x] 2.3 Add the "Add after this" toolbar on the selected block (Case Study, My Experience, Findings, Paragraph, Image) using the existing snippets and image upload. Verify each insertion appears after the block, credits the contributor, and a non-image file shows an error
- [x] 2.4 Add undo and redo of on-page edits as draft snapshots (capped at 100) with buttons and Ctrl+Z / Ctrl+Y. Verify undoing an insertion restores the previous draft exactly
- [x] 2.5 Add the "Review your changes" screen (Before and After side by side, linked scrolling, highlighted changed/added/removed blocks, tabs on narrow screens) shown before the submit dialog and from a "Review changes" action (D9). Verify with one edited paragraph, an inserted section, an unchanged draft, and a phone-width window
- [x] 2.6 Add × (remove this part) to the selected block's bar, and Remove section inside added Case Study / My Experience / Findings sections (D10). Verify with vitest that removal changes only that range across the 12 imported lessons, and in Chrome that removing an added paragraph, an instructor paragraph and a section works and Undo restores the draft exactly
- [x] 2.7 Add the formatting bar at the top of the Page view: bold, italic, underline, strikethrough, link, text colour and highlight from the palette, clear formatting, disabled when nothing is edited; extend the clean-up for `s` and palette styles (D11, D3). Verify with vitest on wrapping, toggling, clearing and dropping non-palette colours, and in Chrome that each format reaches the draft
- [x] 2.8 Add alignment (left, centre, right, justify) by rewriting only the block's start-tag `style` (D11). Verify with vitest that only the start tag changes and other attributes and styles are kept, and in Chrome that a paragraph centres

## 3. Comments database (D6)

- [x] 3.1 Write `supabase/migrations/0005_note_comments.sql` (table, indexes, row-level security policies, column grants, `set_comment_resolved`) and apply it on staging. Verify the table and policies exist with `list_tables` and a policy query
- [x] 3.2 Extend `supabase/tests` with comment assertions: author and reviewer can read, another reader and signed-out cannot; replies only by author or reviewer; edit and delete own only; resolve by author or reviewer; deleting a thread removes replies. Verify they pass on staging and roll back
- [x] 3.3 Add `src/lib/data/comments.ts` (list threads for a note, add comment, reply, edit, delete, resolve/reopen, open threads for the review area) with vitest tests using a mocked client

## 4. Comments in the reader and review area (D7, D8)

- [x] 4.1 Add anchoring: build `{quote, prefix, suffix, path}` from a selection in the shadow root, and find and highlight an anchor with temporary marks. Verify with vitest on sample HTML (exact, moved and missing text)
- [x] 4.2 Add the "Comment" button on text selection and a block picker, with the new-comment form (2,000 characters max, sign-in prompt when signed out). Verify in Chrome that a comment posts with the selected quote
- [x] 4.3 Add the Comments button with the open-thread count and the side panel (threads, replies, resolve/reopen, edit, delete, resolved list, earlier-version note), and scroll-to-highlight. Verify in Chrome, with stubbed data, each action and the jump to an anchor
- [x] 4.4 Add "Open comments" to the review area, limited by row-level security to the reviewer's courses. Verify a course X editor sees only course X threads
- [x] 4.5 When an on-page edit can't be mapped back to the source, show a message with a "Leave a comment" action that opens the comment form quoting that text. Verify with a test document whose rendered tree differs from the source, and that the draft is unchanged

## 5. Release

- [ ] 5.1 Run the unit tests, typecheck and build, check the suggest Page view and comments end to end in Chrome against staging data, and record what was verified with real accounts in this file
- [x] 5.2 Update `docs/` with a short guide for contributors (editing on the page, comments) and verify it renders
- [x] 5.3 Update `docs/contributing-on-the-page.md` for removing parts and the formatting bar

## Workflow follow-up

- Merge, deploy, and archive the change with `/opsx:archive` once reviewed and tested with real accounts.
