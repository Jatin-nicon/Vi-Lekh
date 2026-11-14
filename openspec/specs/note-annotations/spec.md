# Note Annotations Specification

## Purpose

Enables interactive in-browser annotations on lecture notes with freehand pen, highlighting, underlining, typed text boxes, sticky toolbar controls, and vector-crisp PDF export.

## Requirements

### Requirement: Sticky annotation toolbar controls
The reader view SHALL provide a sticky non-scrolling toolbar pinned at the top of the reading pane with mode selectors for freehand pen, highlighter, underline, shapes dropdown (rectangle, circle, arrow, line, star, cloud), text box, eraser, color choices, undo, and PDF export, defaulting to the pen tool upon note load.

#### Scenario: Sticky toolbar remains visible during scrolling
- **WHEN** a user scrolls vertically down through multi-page note content
- **THEN** the annotation toolbar remains pinned at the top of the reading viewport floating cleanly below the application navbar (`top-20`) without being scrolled out of view by container overflow

#### Scenario: Switch between cursor and drawing modes
- **WHEN** a user selects the pen, highlighter, shapes, or text box tool
- **THEN** the system activates the vector drawing overlay and sets pointer events to the selected tool mode

#### Scenario: Switch back to cursor mode
- **WHEN** a user switches between drawing tools or finishes a shape drag
- **THEN** the system maintains the active drawing tool state without unexpected selection interruptions

#### Scenario: Pen is the default active tool
- **WHEN** a user opens any lecture note
- **THEN** the system initializes the annotation toolbar with the freehand pen tool active by default

#### Scenario: Open shapes dropdown menu
- **WHEN** a user clicks the shapes tool button in the toolbar
- **THEN** the system displays a dropdown popover menu displaying standard shape options: Rectangle, Circle / Ellipse, Arrow, Straight Line, Star, and Cloud

#### Scenario: Select a shape from the dropdown
- **WHEN** a user selects a specific shape from the shapes menu
- **THEN** the system sets the active annotation tool to that shape, updates the toolbar button icon to reflect the selected shape, and closes the dropdown menu

#### Scenario: Pen stroke width dropdown menu
- **WHEN** a user clicks the pen tool button or its down arrow
- **THEN** the system toggles a dropdown popover menu presenting stroke width choices (Thin 1.5pt, Medium 2.5pt, Thick 4.0pt) without expanding the horizontal footprint of the toolbar

#### Scenario: Dynamic text styling toolbar
- **WHEN** a user selects or focuses an annotation text box
- **THEN** the sticky toolbar dynamically transforms into text styling mode offering Done, Bold toggle, Italic toggle, Border outline toggle, Font Size dropdown/pills (12pt, 14pt, 18pt, 24pt), color palette, and delete box controls

#### Scenario: Dynamic shape styling toolbar
- **WHEN** a user completes drawing a new shape or clicks to select an existing shape
- **THEN** the system automatically selects the shape and the sticky toolbar dynamically transforms into shape styling mode offering Done, Stroke Width selector (1.5pt, 2.5pt, 4pt), Fill Opacity selector (0%, 20%, 50%, 100%), color palette, and delete shape controls; opacity controls SHALL NOT be displayed in the default toolbar before a shape is drawn or selected

### Requirement: Layered vector drawing, highlighting, and underlining
The system SHALL provide an interactive SVG vector overlay bounded to each individual PDF page that captures smooth freehand pen strokes, translucent highlighter bands with multiply blending, straight underlines, geometric vector shapes, and stroke/shape erasure.

#### Scenario: Freehand drawing and handwriting
- **WHEN** a user draws on the overlay of a specific PDF page with the pen tool selected
- **THEN** the system records vector SVG paths normalized to that page's intrinsic coordinate space (points) in the selected ink color and stroke width

#### Scenario: Translucent text highlighting
- **WHEN** a user marks text on a PDF page with the highlighter tool
- **THEN** the system renders translucent color strokes with multiply blend mode preserving underlying PDF text visibility

#### Scenario: Underlining text
- **WHEN** a user activates the underline tool and drags horizontally across a PDF page
- **THEN** the system renders a straight underline beneath the target text bounded to that page

#### Scenario: Erasing strokes
- **WHEN** a user clicks on an existing stroke, shape, or text box with the eraser tool
- **THEN** the system removes that specific annotation from the target page's annotation layer

#### Scenario: Drag-to-draw geometric shapes
- **WHEN** a user selects a shape tool (rectangle, circle, arrow, line, star, or cloud) and drags across a page overlay
- **THEN** the system renders a live vector shape preview during drag and commits the finished shape with transparent interior styling and active color swatch upon pointer release

#### Scenario: Select and move geometric shapes
- **WHEN** a user clicks anywhere within the bounded interior area of an existing closed shape (rectangle, circle, star, cloud) or within the proximity buffer of an open shape (line, arrow) on a PDF page
- **THEN** the system activates that shape displaying a high-visibility bounding selection frame (with contrasting halo outline) and 4 corner resize anchors styled with solid accent fill, white halo border, and elevation shadow to prevent blending into white PDF pages or dark backgrounds, and dragging the move handle repositions the shape in real time

#### Scenario: Resize geometric shapes
- **WHEN** a user drags any of the 4 corner resize anchors of an active shape
- **THEN** the system scales the shape boundaries proportionally in real time while maintaining crisp anchor visibility across all page backgrounds

#### Scenario: Shape fill opacity styling
- **WHEN** a user adjusts the fill opacity option on a shape
- **THEN** the system renders the shape with the chosen interior opacity (0% transparent, 20% tint, 50% medium, or 100% solid) using the shape's stroke color

### Requirement: Click-to-type annotation text boxes
The system SHALL allow users to click anywhere on a PDF page canvas to insert, type, and edit custom text boxes that persist across sessions and export into the downloaded PDF.

#### Scenario: Insert and edit text box
- **WHEN** a user selects the text tool and clicks on a specific PDF page
- **THEN** the system places an editable Word/Docs-style text box with a transparent background and bounding frame at the clicked position normalized to that page's coordinates, and focuses the input for immediate typing

#### Scenario: Word/Docs-style selection frame and resizing
- **WHEN** a user clicks or selects a text box on a PDF page
- **THEN** the system displays a bounding selection frame with corner resize handles and border drag indicator, allowing dragging to reposition and handle dragging to adjust width

#### Scenario: Text box persistence while active
- **WHEN** an active text box is created on a PDF page
- **THEN** the text box remains visible and editable with placeholder guidance until explicitly committed, deleted, or tool changed

#### Scenario: Delete text box with eraser tool
- **WHEN** a user clicks on an existing text box with the eraser tool
- **THEN** the system removes that text box from the page's annotation layer

#### Scenario: Render text boxes in PDF export
- **WHEN** a user triggers PDF export
- **THEN** the system bakes the typed text boxes with a 100% transparent background into the target PDF page vector stream at exact page coordinates, drawing an enclosing rectangular border outline only when `hasBorder` is explicitly enabled on the text box and omitting the outline by default, ensuring underlying slide content remains fully visible

#### Scenario: Text box typography formatting
- **WHEN** a user toggles bold, italic, or adjusts font size for an active text box
- **THEN** the system immediately updates the text box typography onscreen and preserves these properties in storage

#### Scenario: Text box border styling toggle
- **WHEN** a user toggles the border outline option for an active text box
- **THEN** the system updates the text box border appearance onscreen and preserves the `hasBorder` state in storage, defaulting to false (borderless)

### Requirement: Browser-session annotation caching
The system SHALL save active annotations, geometric shapes, and typed text boxes to browser storage for the current note and restore them automatically upon page reload.

#### Scenario: Persist annotations on stroke completion
- **WHEN** a user finishes drawing a stroke, shape, underline, or editing a text box on any page
- **THEN** the system saves the serialized vector paths, shapes, and text boxes to localStorage keyed by note identifier and page index

#### Scenario: Restore annotations on return
- **WHEN** a user returns to a previously annotated PDF note
- **THEN** the system reloads the cached stroke paths, shapes, and text boxes, and renders them on their respective PDF pages

### Requirement: Annotated vector PDF print export
The reader view SHALL allow exporting the lecture note and its vector annotations, shapes, and text boxes into a high-resolution PDF via client-side PDF binary generation with navigation chrome suppressed.

#### Scenario: Trigger PDF export
- **WHEN** a user clicks the export PDF button in the toolbar
- **THEN** the system loads the original PDF binary, draws continuous smooth vector Bézier paths with round caps for pen strokes, translucent highlighter bands with multiply blend mode, round-capped straight underlines, vector geometric shapes (rectangle, circle, arrow, line, star, cloud), and transparent text boxes directly onto the corresponding PDF pages via client-side PDF generation, and triggers an immediate file download without invoking the browser print dialog

#### Scenario: Bake typography and shape fills into PDF
- **WHEN** a user exports a note containing styled text boxes and filled shapes to PDF
- **THEN** the system embeds standard Helvetica, Helvetica-Bold, Helvetica-Oblique, or Helvetica-BoldOblique font variants matching the text styling and bakes shape fill opacities natively into the output PDF byte stream

### Requirement: Multi-page PDF page rendering and text selection
The reader view SHALL render uploaded PDF documents page-by-page using high-DPI canvas rendering, complete with a selectable text layer allowing text selection and copying.

#### Scenario: Render multiple PDF pages sequentially
- **WHEN** a user opens a PDF-backed lecture note
- **THEN** the system loads and renders all pages of the document in a continuous vertical reading pane with page numbers indicated

#### Scenario: Select and copy text from PDF
- **WHEN** a user drags across text on a rendered PDF page with the cursor tool selected
- **THEN** the system highlights the native text via the text layer and copies the text to the system clipboard upon copy command

#### Scenario: Zoom controls scale PDF and annotations proportionally
- **WHEN** a user adjusts the zoom level (e.g. 100%, 125%, 150%, or Fit to Width)
- **THEN** the system scales the PDF canvas, text layer, and vector annotation layers in exact lockstep maintaining 1:1 alignment
