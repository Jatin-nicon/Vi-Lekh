# Spec Delta

## MODIFIED Requirements

### Requirement: Layered vector drawing, highlighting, and underlining
The system SHALL provide an interactive SVG vector overlay bounded to each individual PDF page that captures smooth freehand pen strokes, translucent highlighter bands with multiply blending, straight underlines, and stroke erasure.

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
- **WHEN** a user clicks on an existing stroke with the eraser tool
- **THEN** the system removes that specific annotation path from the target page's annotation layer

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
- **THEN** the system bakes the typed text boxes with transparent background into the target PDF page vector stream at exact page coordinates

### Requirement: Browser-session annotation caching
The system SHALL save active annotations and typed text boxes to browser storage for the current note and restore them automatically upon page reload.

#### Scenario: Persist annotations on stroke completion
- **WHEN** a user finishes drawing a stroke, underline, or editing a text box on any page
- **THEN** the system saves the serialized vector paths and text boxes to localStorage keyed by note identifier and page index

#### Scenario: Restore annotations on return
- **WHEN** a user returns to a previously annotated PDF note
- **THEN** the system reloads the cached stroke paths and text boxes, and renders them on their respective PDF pages

### Requirement: Annotated vector PDF print export
The reader view SHALL allow exporting the lecture note and its vector annotations and text boxes into a high-resolution PDF via client-side PDF binary generation with navigation chrome suppressed.

#### Scenario: Trigger PDF export
- **WHEN** a user clicks the export PDF button in the toolbar
- **THEN** the system loads the original PDF binary, draws vector paths, translucent highlights, underlines, and transparent text boxes directly onto the corresponding PDF pages via client-side PDF generation, and triggers an immediate file download without invoking the browser print dialog

## ADDED Requirements

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
