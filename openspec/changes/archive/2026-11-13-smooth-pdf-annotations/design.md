# Design

## Context

See `proposal.md` for background and motivation. Vi-Lekh's client-side export utility (`src/lib/pdf/pdf-export.ts`) currently uses discrete straight line calls (`page.drawLine`) across sampled coordinate points for pen and highlighter strokes. Because `drawLine` defaults to butt caps and does not interpolate quadratic Bézier curves, handwritten strokes appear as jagged polygonal chains and highlighter joints accumulate doubled opacity. Furthermore, floating text boxes are currently rendered with an opaque white background (`color: rgb(1, 1, 1)` with `opacity: 0.95`), obscuring lecture slide diagrams and text.

## Goals / Non-Goals

**Goals:**
- Render smooth, organic, continuous freehand pen and highlighter strokes in the exported PDF matching the on-screen SVG by utilizing `pdf-lib`'s native `page.drawSvgPath` with `pointsToSvgPath(stroke.points)` and `LineCapStyle.Round`.
- Render highlighter strokes using `BlendMode.Multiply` in `pdf-lib` to preserve readability of text beneath highlighters.
- Render annotation text boxes with transparent backgrounds (omitting fill color in `drawRectangle`), leaving slide content underneath 100% visible.
- Apply `LineCapStyle.Round` on straight underlines.

**Non-Goals:**
- Changing on-screen SVG rendering (it already renders smooth Bézier curves).
- Modifying database schemas or REST API endpoints.

## Decisions

### Decision 1: Use `page.drawSvgPath` with quadratic Bézier paths instead of discrete `page.drawLine`
- **Choice**: Convert the stroke's coordinate array into an SVG path string via `pointsToSvgPath(stroke.points)` and pass it directly to `page.drawSvgPath(svgPath, { x: 0, y: pageHeight, borderColor, borderWidth, borderLineCap: LineCapStyle.Round, borderOpacity })`.
- **Alternatives Considered**:
  - Drawing more intermediate line segments via interpolation: Inefficient, balloons PDF byte size, and still suffers from flat butt-cap joints.
- **Rationale**: `pdf-lib` translates SVG quadratic Bézier curves (`Q`) directly into native PDF curve operators (`v`) and round line caps (`1 J`), providing vector smoothness identical to on-screen rendering with minimal PDF byte overhead.

### Decision 2: Pure transparent text box background
- **Choice**: In `page.drawRectangle`, omit `color: rgb(...)` and set `opacity: 1` so only the border is stroked with no background fill.
- **Alternatives Considered**:
  - Setting white background with lower opacity (e.g. 0.2): Still slightly washes out high-contrast slides.
- **Rationale**: Pure transparency matches the on-screen experience where text boxes have `bg-transparent`.

## Risks / Trade-offs

- **[Risk] Path coordinate transformation across flipped Y axis in PDF**  
  → **Mitigation**: `pdf-lib`'s `drawSvgPath` automatically inverts Y when `y: pageHeight` is provided. This maps top-left SVG coordinates 1:1 onto the PDF page.

