# Spec Delta

## ADDED Requirements

### Requirement: Clean print media presentation
The system SHALL provide a print-optimized media presentation that isolates the lecture note sheet, suppresses navigation chrome, sidebars, and UI triggers, and formats typography on a clean white background.

#### Scenario: Trigger print on lecture note
- **WHEN** user initiates a print command (such as Ctrl+P or clicking the print action) on an open lecture note
- **THEN** the system hides the navigation bar, course syllabus sidebar, and interactive action buttons, rendering solely the lecture note document with crisp high-contrast text on white paper

#### Scenario: Preserve mathematical formulas and code blocks across page breaks
- **WHEN** a note containing LaTeX math blocks or syntax-highlighted code is printed across multiple pages
- **THEN** the system applies page-break avoidance to prevent formulas and code blocks from splitting awkwardly across physical page seams

### Requirement: Explicit print action trigger
The note reader header SHALL provide a visible print action button allowing users to invoke the document print dialog directly.

#### Scenario: Click print action trigger
- **WHEN** user clicks the print action button in the note header
- **THEN** the system invokes the native window print dialog while maintaining the clean print media stylesheet

