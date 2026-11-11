# Proposal

## Why

The platform's reliance on TipTap and ProseMirror introduced complex AST abstractions, schema restrictions, and brittle DOM serialization edge cases for authors who require direct control over markup, custom tables, inline styling, SVGs, and pedagogical handouts. Retiring TipTap completely and transitioning to a dedicated Pure HTML Editor gives educators and course editors full, unconstrained control over their lecture notes, simplifies data persistence directly to clean HTML, and drastically reduces client bundle overhead by removing all `@tiptap/*` dependencies.

## What Changes

- **Complete TipTap and ProseMirror Removal**:
  - Uninstall all `@tiptap/*` packages (`@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, etc.) from `package.json`.
  - Retire TipTap custom node extensions and slash command palettes.
- **Dedicated Pure HTML Code Editor**:
  - Build a clean, high-performance HTML note editor with line numbers, keyboard indentation shortcuts, tag closing helpers, and document statistics.
  - Provide a quick-insert snippet toolbar for standard course elements: Headings (`<h1>` - `<h3>`), Lists, Callouts, Concept Cards, Process Timelines, KaTeX Math (`$$`), and Worksheet Handout blanks.
- **Real-Time Split & Full Live Preview**:
  - Support instant live preview in Editor, Split, and Reader simulation modes directly in the editor workspace.
- **Direct HTML Persistence & Backward Compatibility**:
  - Standardize note storage to clean HTML.
  - Automatically migrate existing multi-block notes into unified HTML on load via `block-converter.ts`.
- **Reader & Print Rendering**:
  - Update `NoteReader` to render clean document HTML with KaTeX math compilation and print page-break isolation.

## Capabilities

### Modified Capabilities
- `note-editor`: Modifies requirements to specify pure HTML note editing, snippet insertion toolbar, live split preview simulation, and direct HTML document serialization, replacing TipTap block abstractions.

## Impact

- **Dependencies**: Removes all `@tiptap/*` libraries from `package.json`.
- **Editor UI**:
  - `src/components/editor/html-note-editor.tsx`: New primary pure HTML editor component.
  - `src/components/editor/rich-editor.tsx`: Replaced by the pure HTML editor.
  - `src/components/editor/extensions/*`: Deprecated and removed.
  - `src/app/edit/page.tsx`: Updated to use the pure HTML editor and live preview.
- **Data & Converter**:
  - `src/lib/editor/block-converter.ts`: Streamlined to convert legacy blocks to HTML and store pure HTML directly.
- **Reader**:
  - `src/components/reader/note-reader.tsx`: Renders full document HTML directly with KaTeX math and print stylesheet compatibility.

