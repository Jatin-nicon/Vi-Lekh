# Tasks

## 1. Type and PDF Export Updates

- [x] 1.1 Add `hasBorder?: boolean` to `AnnotationTextBox` interface in `src/components/reader/annotation-layer.tsx` and verify TypeScript compilation passes.
- [x] 1.2 Update `src/lib/pdf/pdf-export.ts` to conditionally render `page.drawRectangle` only when `Boolean(box.hasBorder)` is true, defaulting to borderless for all other boxes, and verify TypeScript compilation passes.

## 2. Text Box Toolbar and UI State

- [x] 2.1 Add Border outline toggle button (`Square` icon) to the active text box styling toolbar in `src/components/reader/annotation-toolbar.tsx` wired to `onUpdateActiveTextBox`, and verify active state indicator styling.
- [x] 2.2 Update unselected text box border styling in `src/components/reader/annotation-layer.tsx` to render a solid border when `box.hasBorder` is true and borderless (with subtle dashed hover cue) when false.

## 3. Whole-Area Shape Selection and Line Hit Buffers

- [x] 3.1 Update `renderShape` in `src/components/reader/annotation-layer.tsx` for closed shapes (`rectangle`, `circle`, `star`, `cloud`) so non-preview shapes use `fill="transparent"` and `pointerEvents="all"`, enabling clicking anywhere inside the shape to select it for repositioning or restyling.
- [x] 3.2 Add an invisible proximity hit buffer stroke (`strokeWidth={16}`, `stroke="transparent"`, `pointerEvents="stroke"`) for `line` and `arrow` in `renderShape` to allow effortless selection without pixel-hunting.

## 4. Verification and Build

- [x] 4.1 Run `npm run build` to verify clean Next.js build and TypeScript type-checking without regressions.

## Workflow follow-up

- Request user authorization before committing or pushing changes to git.

