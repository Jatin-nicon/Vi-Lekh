# Tasks

## 1. Data Model & Selection State

- [x] 1.1 Update `AnnotationShape` and `AnnotationTextBox` interfaces in `src/components/reader/annotation-layer.tsx` to support `fillOpacity` (0, 0.2, 0.5, 1.0) and typography properties (`fontSize`, `bold`, `italic`) with backwards-compatible defaults
- [x] 1.2 Add `activeShapeId` state and selection coordination between `src/components/reader/annotation-layer.tsx`, `src/components/reader/annotation-toolbar.tsx`, and `src/components/reader/note-reader.tsx`

## 2. Shape Move & Resize Interaction

- [x] 2.1 Implement high-visibility dual-tone bounding selection frame and corner resize anchors (solid accent fill, white halo border, and elevation shadow) in `src/components/reader/annotation-layer.tsx`
- [x] 2.2 Implement pointer drag interaction for repositioning shapes via the move handle and scaling shapes via the 4 corner anchors with live updates and localStorage auto-persistence

## 3. Dynamic Contextual Toolbar

- [x] 3.1 Implement Pen stroke width dropdown popover menu on the Pen tool button with a down arrow (`ChevronDown`) for selecting `1.5pt Thin`, `2.5pt Medium`, and `4.0pt Thick` in `src/components/reader/annotation-toolbar.tsx`
- [x] 3.2 Implement Text Styling Mode in `src/components/reader/annotation-toolbar.tsx` displaying `Done`, `Bold`, `Italic`, `FontSize` selector (`12pt`, `14pt`, `18pt`, `24pt`), palette swatches, and `Delete Box` when a text box is focused
- [x] 3.3 Implement Shape Styling Mode with `Stroke Width` and `Fill Opacity` pills when a shape is selected, and suppress fill opacity controls from the default toolbar before any shape is drawn in `src/components/reader/annotation-toolbar.tsx`

## 4. Vector PDF Export & Verification

- [x] 4.1 Update `src/lib/pdf/pdf-export.ts` to bake bold and italic text styles using `StandardFonts` (`Helvetica`, `HelveticaBold`, `HelveticaOblique`, `HelveticaBoldOblique`) and shape fill opacities (`opacity` + RGB fill) into exported PDF pages
- [x] 4.2 Verify Next.js production build (`npm run build`) and inspect selection handles across light and dark backgrounds

