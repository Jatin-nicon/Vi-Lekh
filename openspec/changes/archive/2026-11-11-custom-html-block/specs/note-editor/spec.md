# Spec Delta

## ADDED Requirements

### Requirement: Custom HTML block extension
The editor SHALL provide a dedicated custom HTML block extension featuring an interactive in-editor node view with raw markup editing and an in-card live preview toggle.

#### Scenario: Insert and edit custom HTML block
- **WHEN** an author inserts an HTML block and enters raw HTML markup or inline CSS in the code editor
- **THEN** the editor stores the markup content accurately within the document block state

#### Scenario: Toggle live preview mode
- **WHEN** an author clicks the preview toggle on an HTML block
- **THEN** the block switches between the monospace code editor view and the rendered live HTML view

### Requirement: Custom HTML block slash command registration
The editor's slash command palette SHALL register a `/html` command with descriptive metadata, code icon, and search aliases (`raw-html`, `embed`, `custom-html`) to insert a custom HTML block.

#### Scenario: Insert HTML block via slash menu
- **WHEN** an author types `/html` on an empty line and presses enter
- **THEN** the editor inserts an empty custom HTML block focused in edit mode

### Requirement: Custom HTML block serialization and reader rendering
The system SHALL serialize custom HTML blocks into structured JSON blocks and preserve them losslessly, and the reader view SHALL render custom HTML content with print page-break avoidance.

#### Scenario: Serialize and reload HTML block
- **WHEN** an author saves and reopens a note containing custom HTML blocks
- **THEN** the converter losslessly persists the HTML content in JSON note blocks and restores it in the editor

#### Scenario: Reader view display and print styling
- **WHEN** a user views or prints a note containing a custom HTML block
- **THEN** the reader renders the markup inside the document container with page break avoidance in print mode

#### Scenario: Live preview simulation in editor
- **WHEN** an author edits or previews notes containing custom HTML blocks in the split or preview tabs of the editor
- **THEN** the live preview simulation renders the custom HTML blocks in real time mirroring the reader view

