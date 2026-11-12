# Tasks

## 1. Reader & Toolbar UI Cleanup

- [x] 1.1 Remove local file input and "Open PDF" / "Switch PDF" button from `src/components/reader/note-reader.tsx` and verify reading pane header renders cleanly
- [x] 1.2 Remove the "Select" (cursor) button from `src/components/reader/annotation-toolbar.tsx` and set `pen` as default initial tool in `src/components/reader/note-reader.tsx`

## 2. Shapes Dropdown Popover in Toolbar

- [x] 2.1 Add `ShapeType` (`rectangle`, `circle`, `arrow`, `line`, `star`, `cloud`) and shape icons (`Square`, `Circle`, `MoveRight`, `Minus`, `Star`, `Cloud`) to `src/components/reader/annotation-toolbar.tsx`
- [x] 2.2 Implement compact `[Shapes ▾]` button with popover dropdown menu in `src/components/reader/annotation-toolbar.tsx` that switches the active shape tool and displays the active shape icon

## 3. Interactive Shape Drawing in AnnotationLayer

- [x] 3.1 Define `AnnotationShape` data model and shape storage helpers in `src/components/reader/annotation-layer.tsx`
- [x] 3.2 Implement drag-to-draw interaction (`pointerdown`, `pointermove`, `pointerup`) with live transparent-interior SVG shape preview for Rectangle, Circle, Arrow, Line, Star, and Cloud
- [x] 3.3 Add shape erasure support to the Eraser tool and persist shapes in localStorage keyed by note and page

## 4. Vector PDF Export & Verification

- [x] 4.1 Update `src/lib/pdf/pdf-export.ts` to bake shapes into exported PDF binary via `page.drawRectangle`, `page.drawEllipse`, and `page.drawSvgPath` (for line, arrow, star, cloud)
- [x] 4.2 Verify Next.js production build (`npm run build`) and run automated PDF export test asserting vector shape operators in output PDF binary

