# Design

## Context

In `src/components/reader/annotation-layer.tsx`, annotations are split into freehand/highlighter/underline strokes (`annotations`), geometric vector shapes (`shapes`), and click-to-type text boxes (`textBoxes`). Currently, erasing is element-targeted: users must click directly on a stroke path (which may only be 1.5pt thick) or element bounds.

When `tool === "eraser"`, `handleSvgPointerDown` currently exits immediately because it checks `if (!isDrawingTool) return;`.

See `proposal.md` for motivation and user pain points.

## Goals / Non-Goals

**Goals:**
- Provide continuous drag-to-erase sweep across all annotations (strokes, highlighter marks, underlines, geometric shapes, and text boxes).
- Maintain single-click erasing as an instant zero-length drag/click.
- Perform high-performance geometric intersection using AABB (axis-aligned bounding box) pre-filtering followed by exact point-to-segment distance checking.
- Render a live visual eraser reticle (circular halo) following the cursor during active dragging to provide immediate visual feedback of the erasure radius.
- Maintain consistent page-coordinate normalization and undo/redo history.

**Non-Goals:**
- Partial stroke slicing / path cutting (splitting a single vector stroke into multiple sub-segments). Deletion operates at the object level (standard in Apple Notes, GoodNotes, and PDF annotators).
- Modifications to persisted data structures or backend storage.
- Custom eraser shapes beyond the standard circular radius.

## Decisions

### 1. Object Erasure vs. Partial Path Slicing
- **Choice**: Object erasure (erasing the whole stroke, shape, or text box swept over).
- **Rationale**: Vi-Lekh's annotations are vector objects exported directly into vector PDF streams. Slicing cubic Bézier strokes into fragments would degrade PDF export performance, create visual artifact glitches at cut points, and clutter storage. Object erasing is intuitive and standard.
- **Alternatives Considered**:
  - *Pixel bitmap erasing*: Destroys vector fidelity and is incompatible with PDF vector stream baking.
  - *Segment splitting*: Highly complex, creates sub-paths with ragged endpoints, and causes undo/redo bloat.

### 2. Geometric Intersection Pipeline
- **Eraser Radius**: $R = 14\text{pt}$ (approx. 18px at default scale).
- **Sweep Detection**:
  1. **AABB Pre-Filter**: Compute the bounding box of the eraser footprint $[x - R, y - R, x + R, y + R]$. Compare with the precomputed or cached bounding box $[minX, minY, maxX, maxY]$ of each candidate stroke, shape, or text box. Skip candidates with disjoint bounding boxes.
  2. **Strokes / Highlighters / Underlines**: For candidates passing AABB, check Euclidean distance from the eraser center $(x_e, y_e)$ to each line segment $(p_i, p_{i+1})$ of the stroke:
     $$\text{dist}(P, AB) \le R + \frac{\text{strokeWidth}}{2}$$
     If any segment falls within distance, the stroke is marked for removal.
  3. **Geometric Shapes**: Test if eraser center $(x_e, y_e)$ falls inside or within distance $R$ of the shape's bounding box and perimeter.
  4. **Text Boxes**: Test if eraser center is within distance $R$ of the text box's bounding rectangle $[x, y, x + w, y + h]$.
- **Batch State Update**: Collect all touched annotation IDs during each move tick and trigger state updates (`onAnnotationsChange`, `onShapesChange`, `onTextBoxesChange`) only when at least one item was erased, preventing unnecessary re-renders.

### 3. Pointer Capture and Drag Lifecycle
- **Down**: When `tool === "eraser"`, `handleSvgPointerDown` sets `isErasing = true`, captures pointer via `e.currentTarget.setPointerCapture(e.pointerId)`, records the initial point, updates the reticle position, and runs an initial intersection pass (enabling single-click erase).
- **Move**: When `isErasing` is active, update `eraserPoint` in state and execute the sweep intersection pass against all remaining annotations on the page.
- **Up / Cancel**: Release pointer capture, set `isErasing = false`, and clear `eraserPoint` to unmount the visual reticle.

### 4. Interactive Visual Reticle
- While `eraserPoint` is active, render an SVG `<circle>` overlay element at $(x_e, y_e)$:
  - Radius: $14\text{pt}$
  - Fill: `rgba(239, 68, 68, 0.15)` (translucent red)
  - Stroke: `#ef4444` (red-500)
  - Stroke Dasharray: `3 3`
  - Pointer events: `none`
- This makes the active eraser radius unmistakably clear to the user while dragging.

## Risks / Trade-offs

- **[Performance on pages with heavy drawing]** →
  *Mitigation*: AABB bounding box pre-filtering eliminates 95%+ of point-to-segment distance computations before detailed math runs.
- **[Fast cursor sweep skipping thin strokes]** →
  *Mitigation*: $R = 14\text{pt}$ provides a generous 28pt diameter hit area; combined with standard browser 60-120Hz pointer events, strokes are captured reliably even during quick flicks.
- **[Accidental deletion during multi-touch or scrolling]** →
  *Mitigation*: Eraser interaction is only active when the eraser tool is explicitly chosen in the toolbar, and pointer capture ensures only the primary pointer triggers erasures.

