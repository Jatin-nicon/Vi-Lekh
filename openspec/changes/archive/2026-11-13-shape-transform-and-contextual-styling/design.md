# Design

## Context

See `proposal.md` for motivation. Vi-Lekh currently features an interactive sticky annotation toolbar, freehand pen, highlighter, underline, 6 standard geometric shapes (rectangle, circle, line, arrow, star, cloud), and floating text boxes. However, shapes cannot be repositioned or resized after drawing, shape interiors are strictly transparent, stroke widths are hardcoded, and text boxes lack typography formatting. This design specifies the interactive transform architecture, styling options, and dynamic toolbar morphing.

## Goals / Non-Goals

**Goals:**
- Provide intuitive move and resize interactions for all 6 geometric shapes via bounding selection frames, a top move handle, and 4 corner resize anchors.
- Add shape fill opacity choices (`0%`, `20%`, `50%`, `100%`) and stroke width choices (`1.5pt`, `2.5pt`, `4.0pt`) for shapes and pen handwriting.
- Implement a dynamic contextual toolbar that morphs into dedicated styling docks for active text boxes and active shapes.
- Bake bold, italic, font sizes, stroke widths, and shape fill opacities directly into the exported vector PDF via `pdf-lib`.

**Non-Goals:**
- Freeform 360-degree rotation of shapes (unnecessary complexity for lecture note diagrams).
- Complex custom fonts beyond standard system/PDF typography (Helvetica, Helvetica-Bold, Helvetica-Oblique, Helvetica-BoldOblique).

## Decisions

### Decision 1: Contextual Sticky Toolbar Modes
- **Choice**: The sticky toolbar dynamically renders one of three primary interfaces:
  1. **Default Drawing Mode**: Standard tool buttons (Pen with integrated ChevronDown stroke width popover, Highlight, Underline, Shapes dropdown, Text, Eraser, Palette, Undo, Clear, Save PDF). The Pen button features a down arrow that toggles a stroke width popover (`1.5pt Thin`, `2.5pt Medium`, `4.0pt Thick`) without expanding the toolbar's horizontal footprint. Fill opacity options are excluded from default mode until a shape is drawn or selected.
  2. **Text Styling Mode**: Activated whenever an annotation text box is focused or selected (`activeTextId !== null`). Displays `[Done]`, `[B] Bold`, `[I] Italic`, `[Font Size: 12/14/18/24pt]`, active color swatches, and `[Delete Box]`.
  3. **Shape Styling Mode**: Activated whenever an existing shape is selected or immediately after drawing a shape (`activeShapeId !== null`). Displays `[Done]`, `[Stroke Width: 1.5/2.5/4pt]`, `[Fill Opacity: 0%/20%/50%/100%]`, active color swatches, and `[Delete Shape]`.
- **Alternatives Considered**:
  - Permanent secondary sub-toolbar: Clutters reading space on split-screen viewports.
  - Horizontal inline pills for pen width: Caused jarring toolbar width expansion on tool toggle.
  - Showing fill opacity before drawing: Cluttered toolbar with inactive controls before any shape existed.
- **Rationale**: Reusing the sticky toolbar keeps the viewport clean, predictable, and responsive across all device sizes.

### Decision 2: Shape Move & Resize Interaction (Approach B)
- **Choice**:
  - Clicking an existing shape on a page overlay sets `activeShapeId`.
  - A bounding selection frame renders around `[minX, minY, width, height]` with:
    - High-contrast dual-tone frame styling: A 1.5px dashed accent border backed by a subtle halo ring (`ring-1 ring-white/90 shadow-[0_0_0_1px_rgba(37,99,235,0.4)]`), ensuring visibility against both white paper and dark slides.
    - Top floating bar with a `Move` handle, dimension indicator, and a delete button.
    - 4 corner resize anchors (`TL`, `TR`, `BL`, `BR`) styled with solid blue fill (`bg-[#2563EB]`), a crisp 2px white halo border (`border-2 border-white`), and a distinct drop shadow (`shadow-[0_2px_6px_rgba(0,0,0,0.4)]`) sized at 13px (`w-3.5 h-3.5`) with a `w-6 h-6` grab area. This guarantees the anchor squares do not blend into white PDF backgrounds or dark themes.
  - Pointer dragging on the `Move` handle applies `(dx, dy)` deltas in intrinsic PDF points:
    `startX += dx; endX += dx; startY += dy; endY += dy;`
  - Pointer dragging on corner anchors rescales the bounding box and adjusts endpoints proportionally.
  - Clicking outside or clicking `[Done]` in the toolbar deselects the shape and commits it to localStorage.
- **Rationale**: Solid color fills with white perimeter borders and drop shadows prevent hollow or transparent-looking handles on white paper backgrounds, while matching industry standards (Figma, Canva, Adobe Acrobat).

### Decision 3: Data Model Extensions
- **Choice**:
  ```typescript
  export interface AnnotationShape {
    id: string;
    type: ShapeType;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    width: number;        // 1.5, 2.5, 4.0
    fillOpacity?: number; // 0 (none), 0.2 (tint), 0.5 (medium), 1.0 (solid)
  }

  export interface AnnotationTextBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height?: number;
    text: string;
    color: string;
    fontSize?: number;    // 12, 14, 18, 24
    bold?: boolean;
    italic?: boolean;
  }
  ```
- **Rationale**: Optional fields maintain 100% backwards compatibility with existing localStorage keys and cached user notes.

### Decision 4: Vector PDF Export Architecture
- **Choice**:
  - Embed standard Helvetica font variants:
    - Normal: `StandardFonts.Helvetica`
    - Bold: `StandardFonts.HelveticaBold`
    - Italic: `StandardFonts.HelveticaOblique`
    - Bold + Italic: `StandardFonts.HelveticaBoldOblique`
  - For shapes with `fillOpacity > 0`:
    - Rectangles: `page.drawRectangle({ ..., color: rgb(...), opacity: shape.fillOpacity, borderColor: rgb(...), borderWidth: shape.width })`.
    - Circles: `page.drawEllipse({ ..., color: rgb(...), opacity: shape.fillOpacity, borderColor: rgb(...), borderWidth: shape.width })`.
    - SVG Paths (Star, Cloud): `page.drawSvgPath(path, { ..., color: rgb(...), opacity: shape.fillOpacity, borderColor: rgb(...), borderWidth: shape.width })`.
- **Rationale**: Native `pdf-lib` vector operators ensure zero blurriness, fast client-side baking, and small output PDF file sizes.

## Risks / Trade-offs

- **[Risk] Shape selection vs drawing collision**  
  → **Mitigation**: When a drawing tool (pen/highlighter/shape) is active, clicking an empty space starts drawing immediately. Clicking directly on a shape's stroke/body selects it. Once selected, pointer capture isolates move/resize gestures without starting unwanted pen strokes.
- **[Risk] Text wrapping reflow when changing font size or bold**  
  → **Mitigation**: Dynamic line height and container height auto-expand in both the HTML editor (`scrollHeight`) and `pdf-lib` text wrap calculation (`fontSize * 1.35`).

