# Spec Delta

## ADDED Requirements

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
- **THEN** the editor displays the complete rendered document inside the physical paper sheet layout

## MODIFIED Requirements

### Requirement: Structured block serialization
The system SHALL serialize note content directly as clean HTML, migrating legacy block arrays transparently and persisting changes live without intermediate review queues.

#### Scenario: Save document content
- **WHEN** an authorized editor submits note content for saving
- **THEN** the system persists the full HTML content directly to the live note revision record immediately

#### Scenario: Migrate legacy note blocks on load
- **WHEN** an editor opens a note previously saved in the legacy block format
- **THEN** the system automatically compiles the block array into unified HTML for editing

## REMOVED Requirements

### Requirement: Block-based editing and slash commands
**Reason**: TipTap and ProseMirror block abstraction retired in favor of pure HTML editing
**Migration**: Notes are authored directly in HTML with the snippet toolbar

### Requirement: Workbook pedagogical block extensions
**Reason**: TipTap node extensions replaced with native HTML markup snippets and CSS classes
**Migration**: Use snippet toolbar buttons to insert workbook flow, reflection, card, and round templates

### Requirement: Pedagogical slash command registration
**Reason**: TipTap slash commands retired in favor of the snippet toolbar
**Migration**: Use the snippet toolbar to insert pedagogical components

### Requirement: Custom HTML block extension
**Reason**: Replaced by full-document pure HTML editor; individual HTML block extension no longer needed
**Migration**: Author HTML directly anywhere in the document

### Requirement: Custom HTML block slash command registration
**Reason**: Slash commands retired with TipTap removal
**Migration**: Use native HTML code editor

### Requirement: Custom HTML block serialization and reader rendering
**Reason**: Replaced by full-document direct HTML serialization
**Migration**: Use direct HTML document serialization and rendering
