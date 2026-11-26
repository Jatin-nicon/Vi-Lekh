# Proposal

## Why

Suggesting an edit today means changing the note's raw HTML in a code editor. The imported lessons are long HTML documents full of styling code, so most readers can't find the sentence they want to change, and anyone who only has an idea has no way to share it without editing. Contributions will stay rare until readers can edit what they see, or just leave a comment.

## What Changes

- **Edit on the page (suggest mode):** the suggest editor gains a "Page" view that shows the draft exactly as readers see it. Clicking a paragraph, heading, list item, table cell or other text block makes it editable in place; the change is written back into the draft HTML, and everything else in the document (styles, structure, other blocks) stays byte-for-byte as it was.
- **Insert sections on the page:** a small toolbar on the selected block offers "Add after this": Case Study, My Experience, Findings, Paragraph and Image, using the existing contribution snippets with the contributor's name.
- **Page only:** suggest mode shows only the Page view; the HTML code view and the separate preview are removed from suggest mode. Undo and redo cover on-page edits. Course editors' direct-publish editor keeps its code view unchanged.
- **Parts that can't be edited on the page:** if a click can't be safely matched to the HTML, the contributor is told and offered to leave a comment instead.
- **Review before submitting:** a "Review your changes" screen shows the version the contributor started from and their draft side by side, with the changes highlighted, before the summary and submit.
- **Comments:** any signed-in reader can select text, or pick a block, on a note and leave a comment proposing an idea, without editing. A comment is anchored to the quoted text on the version it was made on.
- **Comment threads:** comments can be replied to, and the commenter or a course reviewer can resolve them. Comments are private: only the commenter and the reviewers of the note's course (course admins and editors, and the Super Admin) can see a comment and its replies.
- **Seeing comments:** the reader shows a comment count and a side panel listing open threads; clicking one scrolls to and highlights its anchor. Reviewers also see the open comments for their courses next to the review queue.

## Capabilities

### New Capabilities
- `note-visual-editing`: editing a note's content on the rendered page in suggest mode and writing the changes back into its HTML without disturbing the rest of the document.
- `note-comments`: anchored, threaded, private comments on notes, with replies and resolving, and who may see and manage them.

### Modified Capabilities
<!-- None in openspec/specs/. The suggest editor and review queue this builds on are specified by the in-progress change html-contributions-and-version-history (note-contributions); this change adds to them without changing those requirements. -->

## Impact

- **Code:** suggest editor (`src/components/editor/suggest-editor.tsx`) gains the page view; the HTML viewer (`html-sandboxed-viewer.tsx`) gains an edit mode; new modules for mapping rendered elements back to the source HTML and for comments; the reader (`note-reader.tsx`) and review queue (`src/app/review/page.tsx`) show comments.
- **Database:** new `note_comments` table (threads and replies) with row-level security and a migration (`0005`); no change to existing tables.
- **Depends on:** html-contributions-and-version-history (suggestion drafts, review, versions), which is merged but not yet archived.
- **No new dependencies.**
