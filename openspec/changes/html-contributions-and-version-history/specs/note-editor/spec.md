# Spec Delta

## MODIFIED Requirements

### Requirement: Isolated HTML document and print rendering
The reader and preview views SHALL render authored HTML within a style-isolated container preventing user stylesheets from mutating the host application, and SHALL lay the note content out on fixed-width A4 pages scaled to fit the available width.

#### Scenario: Isolated styles in reader view
- **WHEN** a note containing embedded style tags or CSS resets is rendered
- **THEN** the styles apply exclusively within the note container without mutating the host navigation, sidebar, or theme

#### Scenario: Direct unconstrained layout
- **WHEN** a user views the HTML version of a note in the reader or the editor preview
- **THEN** the note content is laid out at A4 page width (210mm) with consistent page margins and no decorative worksheet blanks, and the whole page is scaled uniformly to fit the viewport width, so line breaks are identical on every screen size

#### Scenario: Readable on small screens
- **WHEN** the scaled page would make body text smaller than readable size on a narrow screen
- **THEN** the user can pinch-zoom or use the zoom control to enlarge the page without changing its line breaks

#### Scenario: Clean print export
- **WHEN** a user prints a note
- **THEN** the system prints the isolated document on A4 pages with the same line breaks as on screen, without artificial container borders, extra padding or interactive controls

### Requirement: Note editor route authorization
The note editor route (/edit) SHALL allow direct editing and publishing only for the Super Admin and designated Course Editors for the corresponding course. Any other signed-in user SHALL get the editor in suggest mode, where saving creates or updates their suggestion draft and nothing is published.

#### Scenario: Authorized editor opens note in editor
- **WHEN** the Super Admin or an assigned Course Editor accesses /edit?note=<id>
- **THEN** the system renders the block editor canvas loaded with the note's current content

#### Scenario: Signed-in reader opens the editor
- **WHEN** a signed-in user who is not an editor for that note's course accesses /edit?note=<id>
- **THEN** the system opens the editor in suggest mode with a "You are suggesting changes" banner, Save Draft and Submit for review actions, and no publish action

#### Scenario: Unauthorized user attempts to access editor
- **WHEN** a signed-out visitor accesses /edit?note=<id>
- **THEN** the system blocks editor access and asks the visitor to sign in

## ADDED Requirements

### Requirement: Contribution section snippets
The editor's snippet toolbar SHALL include Case Study, My Experience and Findings section snippets plus an image upload action, available in both direct and suggest modes. The sections SHALL use print-friendly styling that matches the workbook blocks.

#### Scenario: Insert My Experience section
- **WHEN** an author clicks "My Experience" in the snippet toolbar
- **THEN** the editor inserts a My Experience section with a heading and an editable body at the cursor, and it renders styled in the preview and in print
