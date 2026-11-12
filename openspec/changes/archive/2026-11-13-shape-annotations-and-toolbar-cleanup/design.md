# Design

## Context

See `proposal.md` for background and motivation. Vi-Lekh's annotation system currently supports freehand pen, highlighter, underline, text boxes, and eraser. The reader currently displays an "Open PDF" file selector and a redundant "Select" cursor button. This design details the toolbar restructuring and vector shape architecture.

## Goals / Non-Goals

**Goals:**
- Streamline the reader toolbar: eliminate the "Select" button and header file selector, making `pen` the default tool on load.
- Implement a compact `[Shapes ▾]` dropdown popover in the toolbar showcasing Rectangle, Circle, Arrow, Line, Star, and Cloud with Lucide icons.
- Support real-time drag-to-draw interaction on `AnnotationLayer` with transparent interiors, outline rendering, and active palette color styling.
- Enable single-click erasure of shapes with the existing Eraser tool.
- Persist shapes to localStorage keyed by `noteId` and `pageNumber`.
- Bake shapes into the exported PDF binary as native vector elements via `pdf-lib`.

**Non-Goals:**
- Post-creation shape transformation handles (rotating/skewing); users can delete with the Eraser tool and redraw.
- Solid opaque color fills that obscure lecture slides.

## Decisions

### Decision 1: Shapes Dropdown Popover (Option B)
- **Choice**: Group all geometric shapes under a single `[Shapes ▾]` button in the sticky toolbar. The button displays the currently active shape's icon (defaulting to Rectangle) with a subtle chevron.
- **Alternatives Considered**:
  - Flat buttons for all 6 shapes: Bloats toolbar width on tablets and split screens.
- **Rationale**: Keeps the toolbar compact and responsive while offering quick access to 6 geometric shapes.

### Decision 2: Shape Data Model
- **Choice**:
  ```typescript
  export type ShapeType = "rectangle" | "circle" | "arrow" | "line" | "star" | "cloud";

  export interface AnnotationShape {
    id: string;
    type: ShapeType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    width: number;
  }
  ```
- **Rationale**: Storing start and end coordinates normalized to the page's intrinsic coordinate system allows uniform rendering for both directional shapes (lines, arrows) and bounding-box shapes (rectangles, ellipses, stars, clouds).

### Decision 3: PDF Vector Rendering (`pdf-lib`)
- **Choice**:
  - **Rectangle**: `page.drawRectangle({ x, y, width, height, borderColor, borderWidth: 2 })` without fill.
  - **Circle / Ellipse**: `page.drawEllipse({ x, y, xScale, yScale, borderColor, borderWidth: 2 })` without fill.
  - **Line**: `page.drawLine({ start, end, thickness: 2, color, lineCap: LineCapStyle.Round })`.
  - **Arrow, Star, Cloud**: Converted to SVG path strings and rendered using `page.drawSvgPath` with `LineCapStyle.Round` and `y: pageHeight`.
- **Rationale**: Produces resolution-independent vector graphics with zero bitmap rasterization.

## Risks / Trade-offs

- **[Risk] Touch-scroll vs drag-to-draw collision**  
  → **Mitigation**: Set `touch-action: none` on the active SVG overlay during drawing, and release pointer capture upon pointer up.
- **[Risk] Coordinate scaling during zoom**  
  → **Mitigation**: Store all coordinates normalized to page intrinsic dimensions (`intrinsicWidth` / `intrinsicHeight`), exactly like existing pen strokes.

