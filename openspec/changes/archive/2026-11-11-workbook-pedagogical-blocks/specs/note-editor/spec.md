# Spec Delta

## ADDED Requirements

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

