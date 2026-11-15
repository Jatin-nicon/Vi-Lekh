# Tasks

## 1. Geometric Intersection Math & Helper Utilities

- [x] 1.1 Implement AABB bounding box and point-to-segment Euclidean distance calculation helpers in `src/components/reader/annotation-layer.tsx` and verify clean type checking
- [x] 1.2 Implement shape perimeter/interior hit testing and text box rectangle hit testing against eraser radius $R=14\text{pt}$ and verify compilation

## 2. Eraser Pointer Sweep Interaction & State Management

- [x] 2.1 Update `handleSvgPointerDown`, `handleSvgPointerMove`, and `handleSvgPointerUp` in `src/components/reader/annotation-layer.tsx` to handle `tool === "eraser"` with pointer capture and active drag tracking
- [x] 2.2 Wire real-time continuous batch erasure against strokes, shapes, and text boxes, updating parent state when intersections occur
- [x] 2.3 Render live SVG eraser reticle (circular dashed red halo) centered at cursor position during active dragging

## 3. Verification & Build

- [x] 3.1 Run `npm run build` and verify successful compilation without errors
- [x] 3.2 Verify eraser pointer drag functionality, single-click compatibility, and reticle behavior in reader view

## 4. Undo/Redo History for Annotation Erasures

- [x] 4.1 Implement document snapshot undo/redo stack and global keyboard shortcuts in `src/components/reader/note-reader.tsx`
- [x] 4.2 Connect `onRecordSnapshot` in `src/components/reader/annotation-layer.tsx` to record pre-gesture states for erasures, strokes, shapes, and text boxes
- [x] 4.3 Support Redo and enable Undo button whenever history exists in `src/components/reader/annotation-toolbar.tsx`
- [x] 4.4 Run `npm run build` and verify that erasures can be undone and redone cleanly

## Workflow follow-up

- Request user confirmation before archiving or committing changes.
- Archive the change with `openspec archive --yes "drag-to-erase-annotations"`.

