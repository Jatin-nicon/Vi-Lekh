# Design

## Context

See proposal.md for motivation and the specs for required behavior. What shapes the approach:

- A note's content is one HTML string (`blocks[0].content`). Imported lessons are complete documents (`<!doctype html>…`); notes written in the app are fragments.
- `HtmlSandboxedViewer` renders into a shadow root. For documents it builds the shown markup with `prepareDocument`, which keeps the body's markup but removes `style`, `script`, `link`, `meta`, `title`, `base` and `noscript` elements. Fragments are inserted as is. The viewer then adds its own nodes: page spacers (`data-vl-page-spacer`, inside containers on A4 notes) and link layers (`data-vl-overlay`, at the flow root).
- Drafts autosave through `saveDraft`, and reviewers compare by top-level segment (`diffSegments`), which ignores formatting-only differences.
- The suggestion tables, functions and row-level security from html-contributions-and-version-history are in place; identity comes from the Firebase token (`current_uid()`), and `is_note_reviewer(note_id)` decides reviewer rights.

## Goals / Non-Goals

**Goals:**
- An on-page edit changes only the edited element's inner HTML in the stored string; every other character of the draft stays the same.
- One mechanism for documents and fragments, and for A4 and continuous layouts.
- Comments that keep working after the note changes, by quoting the text they are about.

**Non-Goals:**
- Changing layout, styles or structure on the page (moving, deleting or restyling blocks). Course editors make those in their own editor; contributors can comment to ask for them.
- An HTML code view in suggest mode. Suggest mode is page only.
- Editing inside SVG illustrations, form fields or app-added elements.
- Real-time collaboration, mentions or notifications for comments.
- Comments on PDF notes (the Web version only).

## Decisions

### D1. Splice edits into the source string by source offsets
Parse the draft with `parse5` (`sourceCodeLocationInfo: true`) to get each element's start-tag end and end-tag start offsets, and replace only the edited element's inner range (or insert after its end offset). `parse5` is already in the dependency tree through jsdom; it becomes a direct dependency.

- *Alternative*: edit a `DOMParser` document and serialize it. Rejected: serialization rewrites the whole file (quotes, entities, whitespace, the doctype), producing noisy source diffs and violating "leave the rest unchanged".

### D2. Map rendered elements to source elements by child-index path
For the clicked element, compute its path of element-child indexes from the rendered root (`.vl-doc` for documents, `.vl-flow` for fragments), skipping app-added nodes (`[data-vl-page-spacer]`, `[data-vl-overlay]`). Resolve the same path in the parse5 tree from `body` (documents) or the fragment root, skipping the element kinds `prepareDocument` removes. Both trees come from the HTML parsing algorithm, so their structure matches.

- A mapped element is accepted only if its tag name and its text before editing match the rendered element's. Otherwise the edit is refused, rather than risking a wrong splice, and the contributor is offered to leave a comment on that text instead.

### D3. Editing in place with contenteditable, one block at a time
The viewer gets an edit mode. A click picks the nearest editable text block: a `p`, `h1`–`h6`, `li`, `td`, `th`, `dt`, `dd`, `blockquote`, `figcaption`, `caption` or `summary`, or another element whose children are only text and inline elements, outside SVG, form fields and app-added nodes. Only that element gets `contenteditable`.

- Enter inserts a line break inside the block instead of creating new blocks, and paste inserts plain text.
- On blur, the new inner HTML is cleaned: only inline tags (`b`, `strong`, `i`, `em`, `u`, `a[href]` with http(s)/mailto, `code`, `sub`, `sup`, `br`, `mark`, `span` with its original attributes) are kept, and event attributes and scripts are dropped. It is then spliced into the draft (D1).
- The viewer re-renders from the new draft, so pagination and the link layers update.
- *Alternative*: make the whole page `contenteditable`. Rejected: users could delete structure by accident, and browser editing commands write unpredictable markup across blocks.

### D4. Insert after a block
"Add after this" builds the HTML with the existing `contributionSnippet`, `imageSnippet` or a plain `<p>`, and inserts it at the selected element's end offset in the source. Insertion is only offered for block-level elements, so markup stays valid.

### D5. Undo and redo as draft snapshots
The suggest editor keeps a stack of draft strings (capped at 100). Each on-page commit and insertion pushes a snapshot; undo and redo swap the draft and autosave.

### D9. Before/after review screen
"Review your changes" renders the base version and the draft in two paged viewers side by side, at the same scale, with their scroll positions linked by proportion of height. Changed sections are found with the existing section diff (`diffSegments`): the matching rendered top-level blocks get a highlight class (changed, added on After, removed on Before) in the rendered DOM only. Below a breakpoint the two viewers become tabs.

- *Alternative*: reuse the single merged diff view from the review page. Rejected for contributors: seeing the page as it was and as it will be is easier to read than one document with strike-throughs. The merged view stays for reviewers.

### D6. Comments: threads in one table, privacy in row-level security
New table `note_comments(id, note_id, thread_id null for the first comment, author_id, revision_id, anchor jsonb, body, resolved_at, resolved_by, created_at, updated_at)`. Replies have `thread_id` pointing at the thread's first comment, with `on delete cascade`.

- **Select:** the thread's first author (for replies, the author of the comment `thread_id` points to) or a reviewer of the note.
- **Insert:** `author_id = current_uid()`. A first comment needs a published `revision_id` of the note. A reply needs the user to be the thread's author or a reviewer, and the same note.
- **Update:** own rows only, `body` column only (column grant).
- **Delete:** own rows only.
- **Resolve and reopen:** through a security-definer function `set_comment_resolved(id, resolved)` that checks author-or-reviewer and stamps `resolved_by`.
- *Alternative*: put replies in a JSON array on the comment. Rejected: concurrent replies would overwrite each other, and row-level security can't apply per reply.

### D7. Anchors quote the text
The anchor stores `{quote, prefix, suffix, path}`: the selected text, up to 32 characters on each side, and the D2 path of the block as a hint.

- To find a comment, search the hinted block first, then the whole note for prefix+quote+suffix, then quote alone. Highlight the match with temporary `<mark data-vl-comment>` elements in the rendered DOM only, never in the source.
- No match shows the thread with its quote and the earlier-version note.

### D8. Where comments appear
- **Reader:** a Comments button with the open-thread count opens a side panel (threads, replies, resolve, edit, delete). Selecting text in the Web version shows a small "Comment" button next to the selection. Selection inside the shadow root is read with `getComposedRanges`, with a fallback to `shadowRoot.getSelection`.
- **Review page:** an "Open comments" list beside the queue.

## Risks / Trade-offs

- [Browser and parse5 trees differ for unusual or broken HTML] → D2's tag-and-text check refuses the edit and offers a comment instead; unit tests cover the 12 imported lessons.
- [contenteditable markup differs between browsers] → D3's clean-up keeps a small allowed set of inline tags; tests cover pasting and Enter.
- [Re-rendering after each edit resets scroll or focus] → the viewer keeps the scroll position; edits commit on blur, so focus is not needed afterwards.
- [Comment anchors break when the quoted text is edited] → quote search with prefix and suffix, and a visible "made on an earlier version" state instead of a wrong highlight.
- [Comment privacy relies on row-level security] → pgTAP-style assertions added to `supabase/tests`, covering another reader, a reviewer, the author and a signed-out request.

## Migration Plan

1. Apply `0005_note_comments.sql` (new table, policies, function) on staging and then production. It is additive and doesn't touch existing tables.
2. Deploy the client. Rollback: redeploy the previous client; the table can stay, or be dropped if nothing uses it.
