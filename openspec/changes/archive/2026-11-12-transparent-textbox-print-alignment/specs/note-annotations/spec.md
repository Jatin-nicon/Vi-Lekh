# Spec Delta

## MODIFIED Requirements

### Requirement: Click-to-type annotation text boxes
The system SHALL allow users to click anywhere on the lecture note canvas to insert, type, and edit custom text boxes that persist across sessions and print to PDF.

#### Scenario: Insert and edit text box
- **WHEN** a user selects the text tool and clicks on the document overlay
- **THEN** the system places an editable Word/Docs-style text box with a transparent background and bounding frame at the clicked position and focuses the input for immediate typing

#### Scenario: Word/Docs-style selection frame and resizing
- **WHEN** a user clicks or selects a text box
- **THEN** the system displays a bounding selection frame with corner resize handles and border drag indicator, allowing dragging to reposition and handle dragging to adjust width

#### Scenario: Text box persistence while active
- **WHEN** an active text box is created on the overlay
- **THEN** the text box remains visible and editable with placeholder guidance until explicitly committed, deleted, or tool changed

#### Scenario: Delete text box with eraser tool
- **WHEN** a user clicks on an existing text box with the eraser tool
- **THEN** the system removes that text box from the annotation layer

#### Scenario: Render text boxes in PDF export
- **WHEN** a user triggers PDF export
- **THEN** the system renders the typed text boxes with transparent background aligned 1:1 with note content and vector drawings

### Requirement: Annotated vector PDF print export
The reader view SHALL allow exporting the lecture note and its vector annotations and text boxes into a high-resolution PDF via the browser print engine with navigation chrome suppressed.

#### Scenario: Trigger PDF export
- **WHEN** a user clicks the export PDF button
- **THEN** the system hides the floating toolbar and host navigation, and initiates native print dialog rendering note content, vector annotations, and typed text boxes with transparent background and print alignment

