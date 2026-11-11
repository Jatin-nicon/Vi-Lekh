# cozy-theme Specification

## Purpose
Defines the cozy, low-vibrancy Linen Parchment and Terracotta Dust design tokens, centered paper sheet layout, and relaxed reading presentation.

## Requirements

### Requirement: Cozy Linen Parchment and Terracotta Dust color tokens
The system SHALL style the interface using low-saturation, organic color tokens including soft linen canvas (`#F5F2EB`), warm cream paper sheet (`#FAF8F5`), deep espresso charcoal text (`#2D2926`), and faded terracotta accent (`#A85D44`).

#### Scenario: Display default theme colors
- **WHEN** user loads the application in default mode
- **THEN** system renders the canvas with soft linen background and reading text in deep espresso charcoal without high-vibrancy amber or neon accents

### Requirement: Centered physical paper sheet layout
The reader interface SHALL render note content inside a centered paper-like sheet with subtle border framing and soft shadow elevation on the desk canvas.

#### Scenario: View note on large display
- **WHEN** user opens a note on a desktop browser
- **THEN** system constrains the document content to a centered paper card layout flanked by the linen desk background

### Requirement: Soft callout and code container presentation
The system SHALL present LaTeX math panels and code snippets inside soft, low-contrast containers that blend seamlessly into the warm paper sheet.

#### Scenario: Render math equation callout
- **WHEN** a note contains a mathematical equation block
- **THEN** system displays the formula inside a soft chamomile-tinted panel with subtle wheat borders

### Requirement: Understated ghost action controls
The user interface SHALL present action triggers (such as suggesting edits or navigating history) using subtle, low-vibrancy ghost actions rather than loud saturated pill buttons.

#### Scenario: Display suggest edits trigger
- **WHEN** user views the note action toolbar
- **THEN** system displays the edit trigger in an understated muted terracotta border and text style

### Requirement: Interactive theme toggle between Cozy Linen and Dark Peat
The system SHALL support manual toggling between the default Cozy Linen Parchment theme and the Dark Peat theme via the `.dark` DOM root class, ensuring all `dark:` utility styles and CSS theme variables activate immediately upon toggle regardless of OS media query.

#### Scenario: Toggle theme to Dark Peat
- **WHEN** user clicks the theme toggle button in the header
- **THEN** system applies the `.dark` class to the document root, causing background canvas to switch to Deep Peat (`#181716`), surface cards to elevated charcoal (`#21201E`), and text ink to soft wheat (`#E3DFD7`)

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

