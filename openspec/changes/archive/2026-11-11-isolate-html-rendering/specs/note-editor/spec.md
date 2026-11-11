# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Real-time split and reader preview
The editor workspace SHALL provide instant real-time live preview of the rendered HTML across Editor, Split, and Reader simulation modes.

#### Scenario: Real-time split view editing
- **WHEN** an author edits markup in Split mode
- **THEN** the live preview updates the rendered HTML in real time alongside the code editor

#### Scenario: Full reader preview simulation
- **WHEN** an author switches to Preview mode
- **THEN** the editor displays the complete rendered document inside an isolated preview container without altering host editor navigation

