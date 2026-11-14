# Design

## Context

Users annotating PDF slides and documents currently experience two usability friction points:
1. In PDF export (`pdf-export.ts`), `page.drawRectangle` is called unconditionally on all text boxes, baking an enclosing border into the PDF even when users intended clean margin text.
2. In the interactive vector annotation layer (`annotation-layer.tsx`), closed shapes with 0% fill opacity are styled with `fill="none"` and `pointerEvents="stroke"` for selection. This forces users to click precisely on the 1–2px boundary stroke to select or move the shape. Conversely, the eraser tool uses `fill="transparent"` and `pointerEvents="all"`, allowing users to click anywhere within the shape to delete it.

## Goals / Non-Goals

**Goals:**
- Make text box outlines optional in PDF export, defaulting to borderless (Option A) so margin notes and annotations blend cleanly into exported PDFs.
- Add an explicit Border toggle button in the active text box toolbar (`annotation-toolbar.tsx`) allowing users to turn borders on or off per text box.
- Mirror border state on the interactive canvas: show a subtle border when enabled, and borderless (with subtle hover cue) when disabled.
- Allow clicking anywhere within the boundary of closed shapes (rectangle, circle, star, cloud) to select them, matching eraser hit-testing.
- Add an invisible proximity hit buffer (16px) around open shapes (lines and arrows) for effortless selection.

**Non-Goals:**
- Custom border corner radii, dash patterns, or custom border widths for text boxes.
- Global document-level toggle to force all text boxes to one border mode (per-box toggle is more versatile and fits the existing per-box typography model).
- Changing freehand pen stroke selection mechanics.

## Decisions

### Decision 1: Text Box `hasBorder?: boolean` property defaulting to `false`
- **Choice**: Add `hasBorder?: boolean` to `AnnotationTextBox`. When undefined or `false`, omit the border in PDF export and show borderless on canvas when unselected.
- **Rationale**: Clean text annotations without an enclosing rectangle are preferred for lecture note margins. Storing it as an optional boolean maintains backwards compatibility with previously serialized annotations (falsy `undefined` maps directly to borderless).
- **Alternatives considered**:
  - *Bordered by default (`true`)*: Continues cluttering exports by default.
  - *Global export-time checkbox*: Prevents mixing boxed callouts with borderless margin notes in the same document.

### Decision 2: Closed Shape SVG Hit-Testing via `fill="transparent"` & `pointerEvents="all"`
- **Choice**: In `renderShape` within `annotation-layer.tsx`, for closed shapes (`rectangle`, `circle`, `star`, `cloud`), set `fill="transparent"` and `pointerEvents="all"` when not in preview mode and fillOpacity is 0 or undefined.
- **Rationale**: An SVG element with `fill="transparent"` and `pointerEvents="all"` catches pointer clicks across its entire interior area while remaining visually 100% transparent. This exact technique is already proven in the eraser mode.
- **Alternatives considered**:
  - *Separate bounding box click overlay*: Unnecessary DOM overhead when native SVG element properties handle hit-testing directly.

### Decision 3: Line and Arrow Proximity Hit Buffer
- **Choice**: Group `<line>` and `<path>` (arrow) inside a `<g>` wrapper containing an invisible `<line>` / `<path>` with `stroke="transparent"`, `strokeWidth={Math.max(16, strokeWidthVal + 12)}`, and `pointerEvents="stroke"`.
- **Rationale**: Open lines and arrows have zero interior area. An invisible transparent stroke buffer increases the target area from 1.5–4px to 16px, preventing pixel-hunting while keeping visual strokes crisp.
- **Alternatives considered**:
  - *Math-based ray distance calculations in onPointerDown*: Slower, complex coordinate conversions, and redundant when SVG handles hit-testing natively.

## Risks / Trade-offs

- **[Risk]**: Existing stored annotations in localStorage lack `hasBorder`.
  - **Mitigation**: Use `Boolean(box.hasBorder)` in PDF export and UI rendering; `undefined` cleanly evaluates to `false` (borderless).
- **[Risk]**: Full-area shape selection could block clicks to underlying text when a transparent shape overlays a text box.
  - **Mitigation**: Standard stacking order (z-index) applies: text boxes are positioned above SVG shapes or can be clicked by selection. When shapes need repositioning, users can move them freely.

