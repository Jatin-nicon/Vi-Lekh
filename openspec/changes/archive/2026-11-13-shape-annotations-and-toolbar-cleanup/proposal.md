# Proposal

## Why

The lecture reader requires a streamlined, distraction-free annotation interface: temporary development buttons (such as the header "Open PDF" file picker) and redundant buttons (such as "Select") need to be removed in favor of a focused, pen-first workflow. In addition, users need standard vector geometric shapes (Rectangle, Circle, Arrow, Straight Line, Star, and Cloud) to highlight formulas, frame diagrams, point out exam tips, and create callouts both on-screen and in exported vector PDFs.

## What Changes

- **Remove "Open PDF" file selector**: Remove the local file input and "Open PDF" / "Switch PDF" button from the reader header so the reader solely presents the official document attached to the note (PDF or rich-text HTML).
- **Remove "Select" cursor button**: Remove the cursor tool from the toolbar, making the freehand Pen (`pen`) the default active tool upon opening a note.
- **Add "Shapes" dropdown toolbar popover**: Add a compact `[Shapes ▾]` tool button that opens a selection menu featuring:
  - **Rectangle**: Outlined bounding box with rounded corners
  - **Circle / Ellipse**: Outlined ellipse
  - **Arrow**: Directed vector pointer with arrowhead
  - **Straight Line**: Round-capped linear connector
  - **Star**: 5-point emphasis star for key exam concepts
  - **Cloud**: Multi-lobed thought bubble for ideation callouts
- **Interactive Drag-to-Draw**: Support mouse/touch drag on the page annotation layer with a real-time vector preview, transparent interiors (no solid fill blocking underlying slide content), and active color swatch matching.
- **Eraser Integration**: Clicking on any shape with the Eraser tool removes it.
- **Vector PDF Export Baking**: Render shapes as native PDF vector primitives and SVG paths in `pdf-lib` during client-side PDF export.

## Capabilities

### New Capabilities

### Modified Capabilities
- `note-annotations`: Updates annotation toolbar controls by replacing the cursor button with a shapes dropdown, adds interactive geometric vector shape drawing to the page overlay, and bakes vector shapes into exported PDFs.

## Impact

- `src/components/reader/annotation-toolbar.tsx`: Dropdown popover for shapes; removal of cursor tool button.
- `src/components/reader/annotation-layer.tsx`: Drag-to-draw shape creation, SVG shape rendering, and eraser hit detection.
- `src/components/reader/note-reader.tsx`: Removal of file picker input and button; default tool set to `pen`.
- `src/lib/pdf/pdf-export.ts`: Native PDF vector rendering for shapes (`drawRectangle`, `drawEllipse`, `drawSvgPath`).

