# Design

## Context

The Vi-Lekh note platform utilizes a TipTap-based visual WYSIWYG editor (`rich-editor.tsx`) backed by custom React node extensions and structured JSON blocks (`NoteBlock[]`). Documents are serialized to HTML representations with data attributes via `block-converter.ts` and rendered in the view/export mode via `note-reader.tsx`.

See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**
- Provide a dedicated TipTap node extension (`HtmlBlockExtension`) with an interactive in-card React node view.
- Support an in-card toggle between `Edit Code` (monospace textarea) and `Preview Output` (rendered HTML).
- Register `/html` in the slash command palette with keyword aliases (`raw-html`, `embed`, `custom-html`).
- Ensure lossless bidirectional serialization in `block-converter.ts` and `types.ts` (`NoteBlock["type"] = "html"`).
- Render custom HTML blocks cleanly in `NoteReader` with print page-break avoidance (`print:break-inside-avoid`).

**Non-Goals:**
- Heavy IDE features such as Monaco Editor or external iframe sandboxes; a responsive monospace textarea with tab indentation handling provides high speed and simplicity without bloat.
- Converting the entire document into an HTML-only document mode; this block complements the existing visual editor blocks.
- Arbitrary server-side script execution; rendering is client-side DOM interpretation.

## Decisions

### 1. ReactNodeViewRenderer with Local View Mode State
- **Choice**: Implement `HtmlBlockView` using `@tiptap/react`'s `ReactNodeViewRenderer`.
- **Rationale**: Enables seamless React state management for toggling between `Edit Code` and `Preview Output` modes directly inside the block card, along with auto-resizing textareas and quick copy actions.
- **Alternatives Considered**: 
  - *Vanilla DOM NodeView*: Requires manual event listeners and DOM manipulation, making state toggling and preview sync more fragile.
  - *Modal Dialog*: Disrupts writing flow; having in-place preview keeps the author in document context.

### 2. URL/Entity Encoding for Safe HTML Serialization
- **Choice**: Serialize custom HTML content in `data-html` attribute using `encodeURIComponent` / `decodeURIComponent` (similar to existing pedagogical blocks) or encoded payload.
- **Rationale**: Raw unencoded HTML inside data attributes or innerHTML can be corrupted or stripped by HTML parsers and TipTap schema cleaners (e.g., custom SVG, `<style>`, nested tables). URL encoding guarantees 100% lossless fidelity across save and load cycles.
- **Alternatives Considered**: 
  - *Raw innerHTML*: TipTap's schema parser would strip non-standard tags or attempt to parse them into unrecognized nodes.

### 3. Isolated Scoped Container in Reader View
- **Choice**: Render custom HTML inside a dedicated `.note-custom-html` container in `note-reader.tsx` with `dangerouslySetInnerHTML`.
- **Rationale**: Guarantees that custom HTML, tables, diagrams, or styling inject properly while remaining inside the layout bounds of the reader sheet.
- **Alternatives Considered**: 
  - *Iframe rendering*: Adds significant rendering overhead, complex dynamic height calculation, and breaks pagination in print export (`window.print()`).

### 4. Leaf Node DOMSerializer Specification (No Content Hole)
- **Choice**: Leaf atom nodes (`htmlBlock`, and workbook atom extensions) must return `["div", HTMLAttributes]` without the content hole `0` in `renderHTML`.
- **Rationale**: In ProseMirror's `DOMSerializer`, attempting to render a content hole `0` on a leaf node (`isLeaf: true`) throws a fatal `RangeError: Content hole not allowed in a leaf node spec`. This crashed `editor.getHTML()` during TipTap's `onUpdate`, which stopped the editor's change handler from running and prevented custom HTML updates from reaching the note saving pipeline.
- **Alternatives Considered**: 
  - *Wrapping with content: "block+"*: Creates unwanted nested prose paragraphs inside a code block.

### 5. LivePreview Parity with NoteReader
- **Choice**: Update `src/components/editor/live-preview.tsx` to render `block.type === "html"` using `.note-custom-html`.
- **Rationale**: Authors frequently use the "Split" and "Preview" tabs in `/edit` to simulate the reader view. Ensuring `LivePreview` handles custom HTML prevents the block from disappearing when previewing.
- **Alternatives Considered**: 
  - *Leaving LivePreview unhandled*: Leaves a noticeable feature discrepancy between the editor preview and the published reader view.

## Risks / Trade-offs

- **[Risk]** Global CSS leaks from inline `<style>` tags affecting page layout.
  - **Mitigation**: Scoped container `.note-custom-html` and authoring guidance to use local element styles or classes.
- **[Risk]** Large HTML snippets causing textarea lag.
  - **Mitigation**: Lightweight standard controlled textarea with CSS monospace styling and optimized re-renders.
- **[Risk]** Page splits across print pages for tall custom HTML blocks.
  - **Mitigation**: Enforce `break-inside: avoid;` and `print:break-inside-avoid` on the custom HTML block wrapper.

