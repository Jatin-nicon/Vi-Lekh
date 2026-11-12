# Tasks

## 1. Smooth Vector Bezier Path Export

- [x] 1.1 Refactor pen stroke rendering in `src/lib/pdf/pdf-export.ts` to use `page.drawSvgPath` with `pointsToSvgPath(stroke.points)` and `LineCapStyle.Round`
- [x] 1.2 Refactor highlighter rendering in `src/lib/pdf/pdf-export.ts` to use `page.drawSvgPath` with `BlendMode.Multiply` and `LineCapStyle.Round`
- [x] 1.3 Add `LineCapStyle.Round` to underline rendering in `src/lib/pdf/pdf-export.ts`

## 2. Transparent Annotation Text Boxes

- [x] 2.1 Remove opaque white fill (`color: rgb(1, 1, 1)`) from `drawRectangle` in `src/lib/pdf/pdf-export.ts` to render 100% transparent text box backgrounds
- [x] 2.2 Verify that text box text renders crisply above underlying lecture slide content without blocking slide text or diagrams

## 3. Build & End-to-End Export Verification

- [x] 3.1 Run `npm run build` to verify type safety and clean Next.js build compilation
- [x] 3.2 Execute automated PDF export test verifying that exported PDF binary contains native curve operators (`v`), round line caps (`1 J`), multiply blend modes, and transparent text boxes

