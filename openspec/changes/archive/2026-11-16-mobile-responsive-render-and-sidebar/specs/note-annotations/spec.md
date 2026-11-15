# Spec Delta

## MODIFIED Requirements

### Requirement: Sticky annotation toolbar controls
The reader view SHALL provide a sticky non-scrolling toolbar pinned at the top of the reading pane with mode selectors for freehand pen, highlighter, underline, shapes dropdown (rectangle, circle, arrow, line, star, cloud), text box, eraser, color choices, undo, and PDF export, defaulting to the pen tool upon note load and adapting responsively across mobile and desktop viewports.

#### Scenario: Sticky toolbar remains visible during scrolling
- **WHEN** a user scrolls vertically down through multi-page note content
- **THEN** the annotation toolbar remains pinned flush below the application navbar (`top-16`) without detached gaps or being scrolled out of view by container overflow

#### Scenario: Opaque toolbar coverage during scroll
- **WHEN** note content or PDF pages scroll underneath the sticky annotation toolbar
- **THEN** the toolbar renders with a solid 100% opaque surface completely covering underlying text and drawings without translucency or bleed-through

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

#### Scenario: Responsive mobile toolbar containment
- **WHEN** a user accesses the annotation toolbar on a narrow mobile viewport
- **THEN** the toolbar maintains horizontal containment with smooth touch scrolling (`overflow-x-auto`) and visual scroll indicators rather than breaking awkwardly into multiple wrapped lines or leaving controls invisibly hidden

### Requirement: Multi-page PDF page rendering and text selection
The reader view SHALL render uploaded PDF documents page-by-page using high-DPI canvas rendering, complete with a selectable text layer allowing text selection and copying, and dynamic fit-to-width viewport adaptation.

#### Scenario: Render multiple PDF pages sequentially
- **WHEN** a user opens a PDF-backed lecture note
- **THEN** the system loads and renders all pages of the document in a continuous vertical reading pane with page numbers indicated

#### Scenario: Select and copy text from PDF
- **WHEN** a user drags across text on a rendered PDF page with the cursor tool selected
- **THEN** the system highlights the native text via the text layer and copies the text to the system clipboard upon copy command

#### Scenario: Zoom controls scale PDF and annotations proportionally
- **WHEN** a user adjusts the zoom level (e.g. 100%, 125%, 150%, or Fit to Width)
- **THEN** the system scales the PDF canvas, text layer, and vector annotation layers in exact lockstep maintaining 1:1 alignment

#### Scenario: Mobile automatic fit-to-width page scaling
- **WHEN** a user opens a PDF note on a mobile or narrow viewport
- **THEN** the reader automatically computes and sets the initial zoom scale to fit the PDF page width to the available screen width with comfortable horizontal padding, avoiding horizontal document overflow

#### Scenario: Zoom PDF via Ctrl/Cmd + wheel scroll gesture
- **WHEN** a user scrolls the mouse wheel or pinches a trackpad while holding Ctrl or Cmd over the PDF viewer
- **THEN** the system prevents default browser-level page zoom and scales the PDF document and annotation layers smoothly between 0.4x and 2.5x

