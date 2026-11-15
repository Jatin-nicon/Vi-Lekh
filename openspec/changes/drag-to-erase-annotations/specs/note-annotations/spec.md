# Spec Delta

## MODIFIED Requirements

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
- **WHEN** a user clicks on or drags across existing strokes, shapes, or text boxes with the eraser tool
- **THEN** the system continuously detects intersected annotations within an eraser sweep radius and removes them from the target page's annotation layer in real time, and renders an interactive visual reticle following the cursor during active dragging

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
- **WHEN** a user clicks on or sweeps across an existing text box with the eraser tool
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

