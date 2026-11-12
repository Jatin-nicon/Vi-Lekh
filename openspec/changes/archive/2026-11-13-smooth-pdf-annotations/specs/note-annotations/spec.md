# Spec Delta

## MODIFIED Requirements

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
- **THEN** the system bakes the typed text boxes with a 100% transparent background (without opaque fill) into the target PDF page vector stream at exact page coordinates, ensuring underlying slide content remains fully visible

### Requirement: Annotated vector PDF print export
The reader view SHALL allow exporting the lecture note and its vector annotations and text boxes into a high-resolution PDF via client-side PDF binary generation with navigation chrome suppressed.

#### Scenario: Trigger PDF export
- **WHEN** a user clicks the export PDF button in the toolbar
- **THEN** the system loads the original PDF binary, draws continuous smooth vector Bézier paths with round caps for pen strokes, translucent highlighter bands with multiply blend mode, round-capped straight underlines, and transparent text boxes directly onto the corresponding PDF pages via client-side PDF generation, and triggers an immediate file download without invoking the browser print dialog

