# Proposal

## Why

When an author creates a pure HTML lecture note containing full documents or custom embedded `<style>` tags (e.g. `* { margin: 0; padding: 0 }`, `body { ... }`, or custom `:root` color tokens), injecting it directly into the React DOM via un-scoped containers causes the browser to apply those styles globally. This instantly corrupts the host application's navigation header, sidebar, font hierarchies, and page layouts as soon as note data finishes loading. Furthermore, `NoteReader` currently wraps rendered notes in an artificial `.print-sheet` card with excessive padding (`p-8 sm:p-12`), duplicate titles, and fixed max-width constraints that distort reading flow and degrade printed handouts.

## What Changes

- **Shadow DOM Style Isolation**:
  - Introduce an `HtmlSandboxedViewer` component using standard Shadow DOM (`attachShadow({ mode: "open" })`) to render compiled HTML and KaTeX math safely in both `NoteReader` and `LivePreview`.
  - Prevent user-defined CSS rules, inline `<style>` tags, resets (`*`, `body`), and root custom properties from leaking outside the note boundary and hijacking application navigation, sidebar, or user menus.
- **Unconstrained Direct HTML Reader Layout**:
  - Remove the artificial fixed `.print-sheet` wrapper, excessive outer padding (`p-8 sm:p-12`), and hardcoded worksheet blanks (`Name: ____ Date: ____`) from `NoteReader`.
  - Allow the author's HTML document to render directly into the reading area edge-to-edge as designed.
- **Clean Print Output**:
  - Ensure `@media print` cleanly prints the isolated note document without clipping, extraneous scrollbars, or artificial margins.

## Capabilities

### Modified Capabilities
- `note-editor`: Modifies requirements to specify style-isolated rendering of HTML notes (preventing style pollution to host application UI) and unconstrained direct document display in reader and preview modes.

## Impact

- **UI Components**:
  - `src/components/editor/html-sandboxed-viewer.tsx`: New style-isolated shadow DOM viewer component.
  - `src/components/reader/note-reader.tsx`: Updated to use `HtmlSandboxedViewer` and remove the artificial outer sheet wrapping.
  - `src/components/editor/live-preview.tsx`: Updated to use `HtmlSandboxedViewer` for preview isolation.
- **Styles**:
  - `src/app/globals.css`: KaTeX stylesheet and base styles made available within the isolated shadow root.

