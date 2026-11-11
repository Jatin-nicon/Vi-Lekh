# Proposal

## Why

Students and educators reading lecture notes in Vi-Lekh need an interactive way to annotate, highlight key concepts, underline formulas, and draw handwritten remarks directly on the HTML document, then export their annotated study materials to vector-crisp PDFs. Adding an interactive annotation overlay with sticky non-scrolling controls, text boxes, and browser-session persistence gives readers an authentic paper-like study experience without modifying the underlying published note content.

## What Changes

- **Sticky Non-Scrolling Annotation Toolbar**:
  - Pinned floating action bar at the top of the reading viewport (`sticky top-2 z-40`) with frosted-glass backdrop blur that stays fixed as the user scrolls through multi-page lecture notes.
  - Interactive mode toggles: Pointer/Select, Freehand Pen, Translucent Highlighter, Underline tool, Click-to-Type Text Box, and Stroke/Text Eraser.
  - Palette controls: Color selection (Terracotta, Ink Black, Amber Gold, Emerald, Azure), stroke width, Undo, and Clear All.
- **Layered Vector Annotation & Text Overlay**:
  - An interactive SVG vector canvas layered directly over the note content.
  - Supports mouse, touch, and stylus drawing with `pointer-events` toggling so users can fluidly switch between selecting text and drawing annotations.
  - Click-to-type text boxes allowing readers to insert customizable, multi-line typed notes anywhere on the document canvas.
  - Highlighter strokes render with translucent multiply blending to keep underlying text crisp and readable.
- **Browser-Session Persistence**:
  - Saves student drawings, highlights, and typed text boxes locally in `localStorage` keyed by note ID, restoring them automatically on return visits.
- **Integrated PDF Export**:
  - One-click "Export Annotated PDF" button triggering the browser print engine with `@media print` rules that hide navigation chrome and the floating toolbar while preserving crisp vector annotations, typed text boxes, and page formatting.

## Capabilities

### New Capabilities
- `note-annotations`: Manages interactive SVG stroke drawing, text highlighting, underlining, typed text boxes, sticky non-scrolling controls, session persistence, and vector PDF print export.

### Modified Capabilities
<!-- None: note-editor requirements remain intact. -->

## Impact

- **UI Components**:
  - `src/components/reader/annotation-toolbar.tsx`: Sticky floating annotation controls with Text Box tool.
  - `src/components/reader/annotation-layer.tsx`: Interactive SVG drawing and typed text box overlay.
  - `src/components/reader/note-reader.tsx`: Mounts the annotation layer and sticky dock.
- **Styles**:
  - `src/app/globals.css`: Enhanced print rules for SVG stroke layers and typed annotation boxes.
