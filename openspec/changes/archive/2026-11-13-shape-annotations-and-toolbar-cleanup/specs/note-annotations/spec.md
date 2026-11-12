# Spec Delta

## MODIFIED Requirements

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
