# Design

## Context

The platform renders pure HTML lecture notes through `HtmlSandboxedViewer` inside `NoteReader`. Readers can read the lecture notes and trigger print export via `window.print()`. There is currently no drawing, highlighting, or annotating layer available for students to interact with the notes during study sessions.

See `proposal.md` for user motivation and feature requirements.

## Goals / Non-Goals

**Goals:**
- Provide a sticky non-scrolling toolbar that remains pinned at the top of the reading viewport as students scroll through long lecture notes.
- Implement an interactive SVG vector overlay layer supporting freehand pen drawing, translucent highlighting with multiply blending, straight underlines, and stroke erasure.
- Support click-to-type text boxes allowing readers to place, edit, and position typed notes on the document canvas.
- Preserve normal document interaction (text selection, clicking links, copy-paste) when Cursor mode is selected via `pointer-events` pass-through.
- Cache annotations and text boxes per note in `localStorage` so student notes persist across browser reloads.
- Export vector-crisp annotated PDFs via `@media print` with navigation chrome and toolbar cleanly suppressed.

**Non-Goals:**
- Multi-user collaborative WebSocket annotation syncing.
- Permanent mutation of the note's canonical HTML in the Supabase database.

## Decisions

### 1. SVG Vector Overlay vs. HTML5 2D Canvas
- **Choice**: Implement the drawing layer using an absolute-positioned `<svg>` overlay containing `<path>` and `<line>` elements.
- **Rationale**:
  - SVG strokes scale vectorially during browser printing and PDF export, rendering with crisp print quality (300–600 DPI) rather than blurry pixelated raster canvas images.
  - SVG elements naturally support CSS `mix-blend-mode: multiply` and `stroke-opacity`, allowing highlighter marks to illuminate text without obscuring characters.
  - Stroke state is represented as a clean JSON array (`AnnotationStroke[]`) which can be serialized to `localStorage` effortlessly and allows one-click undo and click-to-erase functionality.
- **Alternatives Considered**: HTML5 `<canvas>` (blurry in high-DPI print export and requires complex re-rasterization on window resize).

### 2. Sticky Floating Dock Placement & Pointer Events
- **Choice**: Position the annotation toolbar as a sticky floating pill (`sticky top-20 z-40`) with frosted blur (`backdrop-blur-md`), and ensure ancestor layout containers (`<main>`) use `overflow-visible` so `position: sticky` binds to the viewport scrolling context.
- **Rationale**:
  - Vi-Lekh's top navbar has height `h-16` (64px) with `sticky top-0`. Positioning the toolbar at `top-20` (80px) allows it to float cleanly beneath the navbar.
  - Removing conflicting `overflow-y-auto` from ancestor `<main>` ensures the window scroll context propagates to sticky children without breaking stickiness.
  - The reader can scroll through 10+ pages of workbook notes without losing access to the pen, highlighter, text box, or color swatches.
  - The SVG canvas overlay is set to `pointer-events: none` when the user is in **Cursor mode**, allowing seamless text selection, copy-paste, and link clicking. When **Pen**, **Highlighter**, **Underline**, or **Text** is selected, `pointer-events: auto` captures drawing interactions.
- **Alternatives Considered**: Fixed sidebar (takes up valuable horizontal reading space on mobile and tablet).

### 3. Dynamic Height & Alignment via ResizeObserver
- **Choice**: Measure the note container using a `ResizeObserver` to synchronize the SVG overlay's coordinate space with the note's dynamic height.
- **Rationale**: Ensures drawings and highlights remain locked to their exact text positions even if custom fonts or KaTeX equations adjust container height after initial render.

### 4. Zero-Friction PDF Export
- **Choice**: The "Export PDF" button calls `window.print()` with `@media print` rules that hide the sticky dock, host navbar, and syllabus sidebar while printing the note and SVG annotations edge-to-edge.
- **Rationale**: The browser's native print-to-PDF engine preserves selectable text, embedded fonts, and vector paths with zero external library bundle overhead.

### 5. Positioned Text Box Annotations & Inline Editing
- **Choice**: Implement typed text boxes as positioned HTML elements within the overlay (`AnnotationTextBox { id, x, y, text, color }`).
- **Rationale**:
  - In Text mode, clicking on the canvas spawns a focused text area at the clicked coordinates.
  - Text boxes support multiple lines, auto-expansion, and text editing.
  - When in Eraser mode, clicking an existing text box removes it.
  - In `@media print`, text boxes render with their font color and transparent background, printing sharply onto the PDF alongside handwritten marks.

### 6. Text Box Click Lifecycle & Focus Stabilization
- **Choice**: Eliminate premature blur-deletion race conditions on text box creation.
- **Rationale**:
  - Browser click dispatch sequences (`pointerdown` -> `mousedown` -> `pointerup` -> `click`) can steal focus back to the canvas or body if focus is asserted synchronously.
  - Prevent default focus loss during creation pointer events.
  - Defer textarea focus using an asynchronous tick (`setTimeout`) so focus lands after the browser's click resolution.
  - Do not auto-delete newly spawned text boxes on blur; keep them visible with their placeholder and explicit Done (`✓`) and Delete (`Trash`) controls. Clean up empty boxes only when switching away from the text tool or on explicit delete.

### 7. Word/Docs-Style Document Text Box Architecture
- **Choice**: Structure text boxes as native document floating boxes (Google Docs / Microsoft Word style) with bounded frame, solid background, corner resize handles, and border drag-to-move.
- **Rationale**:
  - In Word/Docs, text boxes have a distinct solid/card background (`bg-white dark:bg-[#1E1C1B]`) and a clean outline so they stand out clearly over the document text without visual confusion.
  - Selecting a text box shows Google Docs-style rectangular/circular handles at corners and edges.
  - Dragging the border moves the box across the page (`cursor: move`).
  - Dragging the right/bottom corner handle resizes the width (`width: number`).
  - Clicking outside deselects the text box into its clean bounded document display state.
  - Pressing `Delete` or `Backspace` when the box is selected (or clicking eraser) deletes it.

## Risks / Trade-offs

- **[Risk]** Window resizing shifts text wrapping slightly and causes annotations to drift.
  - **Mitigation**: Base stroke coordinates on the bounded `.note-content-container` which maintains centered reading margins.
- **[Risk]** Large annotation state filling `localStorage` quota.
  - **Mitigation**: Store strokes as compacted coordinate arrays and limit caching to active notes.
