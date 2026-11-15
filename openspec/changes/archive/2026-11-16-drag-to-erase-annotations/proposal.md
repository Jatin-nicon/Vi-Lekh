# Proposal

## Why

Currently, erasing annotations requires clicking directly on the 1–2px stroke of a path or the body of a shape/text box. This pixel-hunting interaction makes erasing handwritten notes, sketches, and annotations tedious and slow. Adding a drag-to-erase sweep mode allows users to hold down and sweep across any annotations to erase them in real time, matching the standard fluid behavior of digital note-taking applications.

## What Changes

- **Drag-to-Erase Pointer Interaction**:
  - Extend SVG pointer event handling (`handleSvgPointerDown`, `handleSvgPointerMove`, `handleSvgPointerUp`) to support continuous erasing while holding and dragging the pointer when the eraser tool is active.
- **Universal Annotation Intersection Testing**:
  - Implement real-time geometric intersection testing with a configurable eraser sweep radius (~14pt / ~18px).
  - Erase any touched freehand pen strokes, highlighter bands, underlines, geometric shapes, and text boxes encountered along the drag path (Option A).
  - Retain single-click erasing as an instant zero-length sweep.
- **Visual Sweep Feedback**:
  - Render an interactive translucent circular eraser reticle that follows the pointer during active dragging to clearly indicate the sweep radius.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `note-annotations`: Update the `Erasing strokes` scenario under `Layered vector drawing, highlighting, and underlining` to support continuous drag-to-erase sweeps across strokes, shapes, and text boxes alongside single clicks.

## Impact

- **Affected Code**:
  - `src/components/reader/annotation-layer.tsx`: Pointer handlers, geometric intersection math (bounding box pre-filtering, point-to-segment distance, shape/box hit tests), and live sweep reticle indicator.
- **APIs / Data Compatibility**:
  - No database or schema changes. Persisted annotation data models remain 100% unchanged.

