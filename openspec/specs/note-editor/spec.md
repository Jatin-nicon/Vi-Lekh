# note-editor Specification

## Purpose
Provides a Notion-style block editor for authoring and previewing technical notes with rich formatting, KaTeX math blocks, and code highlighting.

## Requirements

### Requirement: Pure HTML code editor and snippet toolbar
The editor SHALL provide a dedicated pure HTML code editor with line numbers, indentation handling, and a snippet toolbar for inserting standard headings, lists, tables, callouts, and math delimiters.

#### Scenario: Author writes raw HTML in code editor
- **WHEN** an author edits note content in the HTML code editor
- **THEN** the editor provides line numbering, indentation handling, and preserves exact markup without AST transformations

#### Scenario: Insert HTML snippets via toolbar
- **WHEN** an author clicks a snippet button from the editor toolbar
- **THEN** the editor inserts the selected HTML template element at the current cursor position

### Requirement: Real-time split and reader preview
The editor workspace SHALL provide instant real-time live preview of the rendered HTML across Editor, Split, and Reader simulation modes.

#### Scenario: Real-time split view editing
- **WHEN** an author edits markup in Split mode
- **THEN** the live preview updates the rendered HTML in real time alongside the code editor

#### Scenario: Full reader preview simulation
- **WHEN** an author switches to Preview mode
- **THEN** the editor displays the complete rendered document inside an isolated preview container without altering host editor navigation

### Requirement: Isolated HTML document and print rendering
The reader and preview views SHALL render authored HTML within a style-isolated container preventing user stylesheets from mutating the host application, and SHALL display note content directly without artificial outer padding.

#### Scenario: Isolated styles in reader view
- **WHEN** a note containing embedded style tags or CSS resets is rendered
- **THEN** the styles apply exclusively within the note container without mutating the host navigation, sidebar, or theme

#### Scenario: Direct unconstrained layout
- **WHEN** a user views a note in the reader view
- **THEN** the note renders directly into the content viewport without restrictive outer sheet wrappers or decorative worksheet blanks

#### Scenario: Clean print export
- **WHEN** a user prints a note
- **THEN** the system prints the isolated document cleanly without artificial container borders or extra padding

### Requirement: KaTeX mathematical equation rendering
The editor and reader views SHALL render mathematical expressions using KaTeX for both inline and display math equations.

#### Scenario: Render LaTeX formula
- **WHEN** user writes LaTeX syntax inside a math block or inline math delimiters
- **THEN** system compiles and renders the formula graphically without syntax errors

### Requirement: Syntax-highlighted code blocks
The editor SHALL support code blocks with syntax highlighting across standard programming languages including Python and JavaScript.

#### Scenario: Select programming language
- **WHEN** user creates a code block and selects Python
- **THEN** system applies Python syntax highlighting to keywords, strings, and comments

### Requirement: Structured block serialization
The system SHALL serialize note content directly as clean HTML, migrating legacy block arrays transparently and persisting changes live without intermediate review queues.

#### Scenario: Save document content
- **WHEN** an authorized editor submits note content for saving
- **THEN** the system persists the full HTML content directly to the live note revision record immediately

#### Scenario: Migrate legacy note blocks on load
- **WHEN** an editor opens a note previously saved in the legacy block format
- **THEN** the system automatically compiles the block array into unified HTML for editing

### Requirement: Note editor route authorization
The note editor route (/edit) SHALL restrict access exclusively to the Super Admin and designated Course Editors for the corresponding course.

#### Scenario: Authorized editor opens note in editor
- **WHEN** the Super Admin or an assigned Course Editor accesses /edit?note=<id>
- **THEN** the system renders the block editor canvas loaded with the note's current content

#### Scenario: Unauthorized user attempts to access editor
- **WHEN** a visitor or an authenticated user who is not an editor for that note's course accesses /edit?note=<id>
- **THEN** the system blocks editor access and redirects the user with an unauthorized access notification

### Requirement: Pedagogical block serialization and deserialization
The system SHALL serialize all workbook pedagogical blocks into valid HTML with structured data attributes, and convert them bidirectionally into typed JSON note blocks without content or attribute loss.

#### Scenario: Persist and reload workbook blocks
- **WHEN** an author saves a document containing flow, reflection, card grid, round, or pinned blocks
- **THEN** the converter serializes them into structured block payloads and accurately restores their interactive states upon reopening
