# Spec Delta

## ADDED Requirements

### Requirement: Workbook pedagogical visual styling
The system SHALL style workbook pedagogical blocks in harmony with the Linen Parchment aesthetic, rendering horizontal flow tracks with connection arrows, lined paper reflection boxes with horizontal writing rules, card grids with semantic border accents, and pinned sticky notes.

#### Scenario: View process flow in reader
- **WHEN** user views a note containing a process flow block on screen
- **THEN** the system renders a responsive horizontal track of cards connected by directional arrows, wrapping gracefully on mobile viewports

#### Scenario: View student reflection note in reader
- **WHEN** user views a note containing a student reflection block
- **THEN** the system displays a lined notebook card with a pencil icon, prompt question, and subtle horizontal ruled lines where users can optionally type local reflections

#### Scenario: View concept and antipattern cards in reader
- **WHEN** user views a note containing a card grid
- **THEN** the system displays a 2-column grid applying distinctive border accents for pitfalls (terracotta red), solutions (sage green), and neutral terms

#### Scenario: View worksheet header layout
- **WHEN** user views a note configured in worksheet mode
- **THEN** the system displays a workbook title banner with student name and date write-in lines

### Requirement: Pedagogical print and worksheet presentation
The system SHALL format pedagogical blocks for high-contrast academic print and physical worksheet completion under print media rules.

#### Scenario: Print student worksheet
- **WHEN** user prints a note containing reflection boxes or worksheet headers
- **THEN** the system renders clean, high-contrast dotted or solid ruled lines for handwriting, preserves card structures with hairline borders, and suppresses interactive digital controls

