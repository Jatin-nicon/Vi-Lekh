# Proposal

## Why

When annotating PDF lecture notes, users frequently place text boxes for margin notes or explanations, but PDF export currently forces an enclosing rectangular border around every text box, cluttering the exported document. Additionally, geometric shapes with transparent fills require clicking precisely on their 1–2px outline to select or move them, whereas the eraser tool can be clicked anywhere inside the shape. Enabling borderless-by-default text boxes with an optional border toggle, alongside full-area hit-testing for shape selection, provides an intuitive and seamless annotation experience.

## What Changes

- **Text Box Border Customization**:
  - Extend `AnnotationTextBox` type with an optional `hasBorder?: boolean` property, defaulting to `false` (Option A: borderless by default).
  - Update PDF export (`pdf-export.ts`) to only draw a rectangular outline if `box.hasBorder === true`. When `false` or undefined, text boxes export cleanly with transparent background and no border.
  - Add a Border toggle button (`Square` icon) in the dynamic text box styling toolbar in `annotation-toolbar.tsx` so users can explicitly toggle an enclosing border when desired.
- **Whole-Area Shape Selection**:
  - Update SVG shape rendering in `annotation-layer.tsx` so closed shapes (rectangle, circle, star, cloud) capture pointer clicks across their entire interior (`fill="transparent"`, `pointerEvents="all"`) when not in preview mode, matching the eraser tool's hit-testing behavior.
  - For open shapes (straight lines and arrows), introduce an invisible transparent stroke buffer (`strokeWidth={16}`) so clicking anywhere near the stroke selects the shape without pixel-hunting.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `note-annotations`: Add optional text box border control (borderless by default in PDF export) and update shape selection hit-testing to allow clicking anywhere inside a shape or near a line/arrow to select it.

## Impact

- **Affected Code**:
  - `src/components/reader/annotation-layer.tsx`: Shape SVG pointer events, fill transparency for hit-testing, line/arrow transparent hit stroke buffers, and text box border styling.
  - `src/components/reader/annotation-toolbar.tsx`: Text styling toolbar with border toggle button and state dispatch.
  - `src/lib/pdf/pdf-export.ts`: Conditional `page.drawRectangle` based on `box.hasBorder`.
  - Annotation data types in `annotation-layer.tsx` / `notes-service.ts`.
- **APIs / Schema**: Backwards-compatible addition of `hasBorder?: boolean` to stored `AnnotationTextBox` items. Existing stored annotations without this property seamlessly treat `hasBorder` as `false`.

