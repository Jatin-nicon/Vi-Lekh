# Spec Delta

## MODIFIED Requirements

### Requirement: Browser-session annotation caching
The system SHALL save active annotations, geometric shapes, and typed text boxes for the current note to the signed-in user's account, tied to the note version they were made on. It SHALL keep a browser storage copy as an offline cache and restore annotations automatically when the page reloads.

#### Scenario: Persist annotations on stroke completion
- **WHEN** a signed-in user finishes drawing a stroke, shape, underline, or editing a text box on any page
- **THEN** the system saves the serialized vector paths, shapes, and text boxes to localStorage keyed by note identifier and page index, and saves them to the user's account within 2 seconds of the last change

#### Scenario: Restore annotations on return
- **WHEN** a user returns to a previously annotated note, on the same or a different device
- **THEN** the system loads the user's saved stroke paths, shapes, and text boxes from their account and renders them on their respective pages

#### Scenario: Offline or signed-out annotating
- **WHEN** a user annotates while signed out or while the account save fails
- **THEN** the system keeps the annotations in localStorage, shows an "Not synced" indicator, and uploads them to the account after the next successful sign-in or reconnect

#### Scenario: Annotations are private
- **WHEN** any user other than the author queries a user's personal annotations
- **THEN** the system does not return them

#### Scenario: Annotations made on an older version
- **WHEN** a user's saved annotations were made on a version older than the note's current version
- **THEN** the system still shows them and displays a notice "Your annotations were made on v<N>; the note has changed since", with an option to view v<N>

### Requirement: Annotated vector PDF print export
The reader view SHALL allow exporting the lecture note and its vector annotations, shapes, and text boxes into a high-resolution PDF via client-side PDF binary generation with navigation chrome suppressed.

#### Scenario: Trigger PDF export
- **WHEN** a user clicks the export PDF button in the toolbar
- **THEN** the system loads the original PDF binary, draws continuous smooth vector Bézier paths with round caps for pen strokes, translucent highlighter bands with multiply blend mode, round-capped straight underlines, vector geometric shapes (rectangle, circle, arrow, line, star, cloud), and transparent text boxes directly onto the corresponding PDF pages via client-side PDF generation, and triggers an immediate file download without invoking the browser print dialog

#### Scenario: Bake typography and shape fills into PDF
- **WHEN** a user exports a note containing styled text boxes and filled shapes to PDF
- **THEN** the system embeds standard Helvetica, Helvetica-Bold, Helvetica-Oblique, or Helvetica-BoldOblique font variants matching the text styling and bakes shape fill opacities natively into the output PDF byte stream

#### Scenario: Export annotated HTML version
- **WHEN** a user clicks export PDF while viewing the HTML version
- **THEN** the system opens the browser's print dialog preset to A4 with no margins, and the saved PDF's content, page breaks and annotation positions match the on-screen pages, with selectable text, vector annotations drawn over each page, and no navigation chrome, toolbars or selection handles

#### Scenario: Annotation crossing a page break
- **WHEN** an HTML-version annotation spans the boundary between two A4 pages
- **THEN** the exported PDF shows each part of the annotation on its page at the same position it had on screen

## ADDED Requirements

### Requirement: Fixed-width page annotation for the HTML version
The HTML version SHALL be annotated on fixed-width A4 pages. Annotation coordinates SHALL be stored in page units, independent of screen size, zoom and theme, so each mark stays over the same content on every device.

#### Scenario: Same position on desktop and phone
- **WHEN** a user highlights a sentence on a 1440px-wide desktop window and later opens the same note on a 390px-wide phone
- **THEN** the highlight covers the same sentence on the phone

#### Scenario: Window resize
- **WHEN** a user resizes the browser window after annotating
- **THEN** the pages and annotations scale together and no annotation moves relative to the text

### Requirement: Shared published annotation layer
When a merged suggestion publishes annotations, readers of that version SHALL see a "Contributor annotations" toggle. It SHALL be off by default, and turning it on draws the published annotations read-only beneath the reader's own.

#### Scenario: Toggle contributor annotations
- **WHEN** a reader turns on "Contributor annotations" on a version that has a published annotation layer
- **THEN** the system draws those annotations read-only, and the reader's own annotations stay editable on top
