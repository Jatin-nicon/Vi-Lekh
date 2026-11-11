# Design

## Context

The platform previously used TipTap and ProseMirror for block-based WYSIWYG note authoring, converting content to and from structured JSON block arrays (`NoteBlock[]`). This created schema constraints, complex node view nesting, and DOM serialization hurdles for educators wanting direct control over custom styling, tables, inline CSS, and layout.

See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Completely uninstall all `@tiptap/*` packages, eliminating bundle overhead and ProseMirror schema complexity.
- Build a fast, lightweight `HtmlNoteEditor` with line numbering gutter, tab indentation handling, tag auto-wrapping, and document statistics.
- Provide a quick-insert snippet toolbar with standard educational components (Headings, Paragraphs, Lists, Callouts, Concept Cards, Process Timelines, KaTeX Math, and Worksheet Blanks).
- Implement real-time live preview in Editor, Split, and Reader simulation modes.
- Preserve backward compatibility with existing notes by migrating legacy block arrays to clean HTML on load.
- Maintain Supabase schema compatibility by persisting document HTML in `revisions.blocks` as `[{ id, type: "html", content }]`.
- Render notes natively in `NoteReader` with KaTeX math equation rendering and print stylesheet isolation.

**Non-Goals:**
- Embedding heavyweight IDEs (e.g., Monaco Editor / VS Code web); a responsive, lightweight monospace code editor provides instant load times, zero SSR issues, and seamless mobile responsiveness.
- Executing arbitrary client-side `<script>` tags; rendering is restricted to standard HTML/CSS and mathematical equations.

## Decisions

### 1. Custom React HTML Editor vs Monaco / CodeMirror
- **Choice**: Implement a tailored `HtmlNoteEditor` with synchronized line gutter, tab key handling (2 spaces), and snippet insertion.
- **Rationale**: Monaco adds ~4MB to the client bundle and introduces SSR challenges in Next.js Turbopack. A native, lightweight editor is fast, reliable, matches the cozy notebook aesthetic, and requires zero external editor dependencies.
- **Alternatives Considered**: Monaco Editor, CodeMirror.

### 2. Backward-Compatible Storage Model
- **Choice**: Store document HTML in the database `revisions.blocks` field as `[{ id: "doc_html", type: "html", content: html }]`.
- **Rationale**: The Supabase table schema uses `blocks: jsonb`. Storing a single root HTML block avoids modifying database schemas or running SQL migrations. When loading legacy notes with multiple block objects (`heading`, `paragraph`, etc.), `blocksToHtml` combines them into unified HTML for editing.
- **Alternatives Considered**: Adding a separate `html_content: text` column (requires database migration and breaks existing stores).

### 3. Quick-Insert Snippet Toolbar
- **Choice**: Replace slash commands with a responsive top-level snippet toolbar with categorical menus or buttons (Typography, Blocks, Cards, Math, Handout).
- **Rationale**: Gives authors one-click insertion of clean, accessible HTML structures without having to remember specific class names or markup syntax.
- **Alternatives Considered**: Modal picker dialog (slower and more disruptive).

### 4. Dynamic KaTeX Math Rendering in HTML
- **Choice**: Automatically parse and render display math (`$$ ... $$`) and inline math (`$ ... $` or `\\( ... \\)`) in `LivePreview` and `NoteReader` using KaTeX.
- **Rationale**: Ensures mathematical theorems, loss functions, and derivations render beautifully within paragraphs, tables, or custom callouts.

## Risks / Trade-offs

- **[Risk]** Unclosed or invalid HTML tags entered by an author.
  - **Mitigation**: The browser's DOM parser tolerates minor markup quirks, and the live preview container isolates rendering so that layout syntax errors do not crash the editor.
- **[Risk]** Global CSS leakage from inline `<style>` tags.
  - **Mitigation**: Scoped container styling (`.note-prose`) and authoring conventions encourage inline style attributes or scoped class names.

