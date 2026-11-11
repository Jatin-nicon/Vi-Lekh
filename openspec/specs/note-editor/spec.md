# note-editor Specification

## Purpose
Provides a Notion-style block editor for authoring and previewing technical notes with rich formatting, KaTeX math blocks, and code highlighting.

## Requirements

### Requirement: Block-based editing and slash commands
The editor SHALL provide a block-based WYSIWYG editing canvas where users can insert and manipulate blocks via a slash (`/`) command menu.

#### Scenario: Insert block via slash menu
- **WHEN** user types `/` in an empty block
- **THEN** system displays a menu of available block types including headings, code, math, and callouts

#### Scenario: Drag and rearrange blocks
- **WHEN** user drags a block by its drag handle to another vertical position
- **THEN** system moves the block to the selected position in the document tree

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
The system SHALL serialize document content as structured JSON blocks and persist changes directly to the live published note without intermediate review proposals.

#### Scenario: Save document content
- **WHEN** an authorized editor or Super Admin submits note content for saving
- **THEN** the system converts the editor canvas state into a valid JSON block array and updates the live note record immediately

### Requirement: Note editor route authorization
The note editor route (/edit) SHALL restrict access exclusively to the Super Admin and designated Course Editors for the corresponding course.

#### Scenario: Authorized editor opens note in editor
- **WHEN** the Super Admin or an assigned Course Editor accesses /edit?note=<id>
- **THEN** the system renders the block editor canvas loaded with the note's current content

#### Scenario: Unauthorized user attempts to access editor
- **WHEN** a visitor or an authenticated user who is not an editor for that note's course accesses /edit?note=<id>
- **THEN** the system blocks editor access and redirects the user with an unauthorized access notification

### Requirement: Workbook pedagogical block extensions
The editor SHALL provide native interactive block extensions for pedagogical handouts, including a horizontal process flow sequencer, a student reflection box, a multi-column concept and antipattern card grid, a multi-round prompt dialogue block, and a pinned key takeaway note.

#### Scenario: Insert and configure process flow block
- **WHEN** author inserts a process flow block and configures steps with icons, titles, and descriptions
- **THEN** the editor displays an editable step track with connection arrows and allows toggling highlight state on any step

#### Scenario: Insert student reflection note box
- **WHEN** author inserts a reflection note block and enters a prompt question
- **THEN** the editor renders a lined workbook writing area with configurable rule lines

#### Scenario: Insert concept and antipattern card grid
- **WHEN** author inserts a card grid and selects border accent styles (Neutral, Pitfall/Red, Solution/Green, Exercise/Dashed)
- **THEN** the editor displays a multi-column card pair with editable title, body, and summary text

#### Scenario: Insert multi-round prompt evolution block
- **WHEN** author inserts a round dialogue block
- **THEN** the editor displays a round number badge with paired input slots for the user prompt and the AI observation

#### Scenario: Insert pinned takeaway card
- **WHEN** author inserts a pinned note block
- **THEN** the editor displays a warm amber sticky note with a pushpin icon for highlighting core principles

### Requirement: Pedagogical slash command registration
The editor's slash command palette SHALL register intuitive command triggers for each pedagogical block (`/flow`, `/your-note`, `/cards`, `/round`, `/pinned`) with descriptive metadata, icons, and keyword aliases.

#### Scenario: Trigger pedagogical block via slash palette
- **WHEN** author types `/flow` or `/your-note` on an empty editor line
- **THEN** the slash command palette displays matching pedagogical items and inserts the corresponding interactive node upon selection

### Requirement: Pedagogical block serialization and deserialization
The system SHALL serialize all workbook pedagogical blocks into valid HTML with structured data attributes, and convert them bidirectionally into typed JSON note blocks without content or attribute loss.

#### Scenario: Persist and reload workbook blocks
- **WHEN** an author saves a document containing flow, reflection, card grid, round, or pinned blocks
- **THEN** the converter serializes them into structured block payloads and accurately restores their interactive states upon reopening
