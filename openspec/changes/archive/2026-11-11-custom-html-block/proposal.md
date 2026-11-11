# Proposal

## Why

Course editors and technical maintainers often need granular control over note styling, custom markup, inline CSS styling, custom tables, or embedded UI widgets that standard visual formatting options do not natively cover. Without an HTML insertion option, authors cannot easily embed customized HTML components. Providing an inline `/html` slash command empowers authors to drop custom HTML blocks directly into the visual document whenever needed, while leaving the existing visual WYSIWYG workflow completely intact for standard writing.

## What Changes

- **Custom HTML Block TipTap Extension (`/html`)**:
  - Introduces a dedicated `HtmlBlockExtension` with an interactive in-editor React NodeView.
  - Provides a clean monospace code editor for typing or pasting raw HTML and inline CSS.
  - Includes an in-card `Edit Code` ⇄ `Preview Output` toggle allowing authors to immediately inspect the rendered HTML in place within the visual editor canvas.
- **Slash Command Registration**:
  - Registers `/html` in `slash-items.ts` under the technical authoring category with aliases (`raw-html`, `embed`, `custom-html`).
- **Block Model & Serialization**:
  - Adds `"html"` to `NoteBlock["type"]` in `src/lib/supabase/types.ts`.
  - Updates `block-converter.ts` with lossless bidirectional serialization between TipTap `<div data-type="html-block">` and structured `NoteBlock` payloads.
- **Reader & Print Rendering**:
  - Updates `NoteReader` in `src/components/reader/note-reader.tsx` to natively render custom HTML blocks with full fidelity inside the document sheet.
  - Applies print break-avoidance (`break-inside: avoid;`) in `@media print` so custom HTML components print cleanly without page splits.

## Capabilities

### Modified Capabilities
- `note-editor`: Adds requirements for inline custom HTML block authoring, `/html` slash command trigger, in-editor live preview, and bidirectional block serialization.

## Impact

- **Editor Components**:
  - `src/components/editor/extensions/html-block.tsx`: New TipTap extension and React node view.
  - `src/components/editor/extensions/slash-items.ts`: Registers `/html` slash command.
  - `src/components/editor/rich-editor.tsx`: Registers `HtmlBlockExtension`.
- **Data & Serialization**:
  - `src/lib/supabase/types.ts`: Extends `NoteBlock["type"]` with `"html"`.
  - `src/lib/editor/block-converter.ts`: Implements HTML block conversion.
- **Reader**:
  - `src/components/reader/note-reader.tsx`: Renders custom HTML blocks.

