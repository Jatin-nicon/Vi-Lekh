# Note Annotations Specification

## Purpose

Enables interactive in-browser annotations on lecture notes with freehand pen, highlighting, underlining, typed text boxes, sticky toolbar controls, and vector-crisp PDF export.

## Requirements

### Requirement: Sticky annotation toolbar controls
The reader view SHALL provide a sticky non-scrolling toolbar pinned at the top of the reading pane with mode selectors for cursor, freehand pen, highlighter, underline, text box, eraser, color choices, undo, and PDF export.

#### Scenario: Sticky toolbar remains visible during scrolling
- **WHEN** a user scrolls vertically down through multi-page note content
- **THEN** the annotation toolbar remains pinned at the top of the reading viewport floating cleanly below the application navbar (`top-20`) without being scrolled out of view by container overflow

#### Scenario: Switch between cursor and drawing modes
- **WHEN** a user selects the pen, highlighter, or text box tool
- **THEN** the system activates the vector drawing overlay and sets pointer events to drawing or text mode

#### Scenario: Switch back to cursor mode
- **WHEN** a user selects the cursor tool
- **THEN** the system allows normal text selection, clicking, and scrolling without drawing strokes

### Requirement: Layered vector drawing, highlighting, and underlining
The system SHALL provide an interactive SVG vector overlay that captures smooth freehand pen strokes, translucent highlighter bands with multiply blending, straight underlines, and stroke erasure.

#### Scenario: Freehand drawing and handwriting
- **WHEN** a user draws on the overlay with pen tool selected
- **THEN** the system records and renders vector SVG paths in the selected ink color and stroke width

#### Scenario: Translucent text highlighting
- **WHEN** a user marks text with the highlighter tool
- **THEN** the system renders translucent color strokes with multiply blend mode preserving text visibility

#### Scenario: Underlining text
- **WHEN** a user activates the underline tool and drags horizontally
- **THEN** the system renders a straight underline beneath the target text

#### Scenario: Erasing strokes
- **WHEN** a user clicks on an existing stroke with the eraser tool
- **THEN** the system removes that specific annotation path from the canvas

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

### Requirement: Browser-session annotation caching
The system SHALL save active annotations and typed text boxes to browser storage for the current note and restore them automatically upon page reload.

#### Scenario: Persist annotations on stroke completion
- **WHEN** a user finishes drawing a stroke, underline, or editing a text box
- **THEN** the system saves the serialized vector path and text box list to localStorage keyed by note identifier

#### Scenario: Restore annotations on return
- **WHEN** a user returns to a previously annotated note
- **THEN** the system reloads the cached stroke paths and text boxes, and renders them on the overlay

### Requirement: Annotated vector PDF print export
The reader view SHALL allow exporting the lecture note and its vector annotations and text boxes into a high-resolution PDF via the browser print engine with navigation chrome suppressed.

#### Scenario: Trigger PDF export
- **WHEN** a user clicks the export PDF button
- **THEN** the system hides the floating toolbar and host navigation, and initiates native print dialog rendering note content, vector annotations, and typed text boxes with transparent background and print alignment

