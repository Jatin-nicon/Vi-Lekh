# Spec Delta

## MODIFIED Requirements

### Requirement: Hierarchical syllabus and navigation
The system SHALL organize notes within a structured hierarchy of courses and modules with a persistent navigation sidebar in a pure read-only reader view, providing a pinned sidebar with independent scrolling on desktop viewports and a collapsible slide-over drawer on mobile viewports.

#### Scenario: View course syllabus
- **WHEN** user navigates to a course reader page (/notes?course=...)
- **THEN** system displays the ordered list of modules and notes in that course with direct links to each note without displaying edit or suggestion controls

#### Scenario: Navigate between notes
- **WHEN** user selects a note from the navigation sidebar
- **THEN** system loads the selected note content while preserving navigation context and breadcrumb trail

#### Scenario: Desktop persistent pinned sidebar with independent scrolling
- **WHEN** a user views a note on a desktop viewport (width >= 768px) and scrolls vertically through the document
- **THEN** the syllabus sidebar remains pinned in place alongside the document reader with its own independent vertical scrollbar, preventing syllabus navigation controls from scrolling out of view

#### Scenario: Desktop and laptop sidebar custom scrollbar styling
- **WHEN** a user views or scrolls the syllabus sidebar on a desktop or laptop viewport
- **THEN** the system displays a slim, non-intrusive custom scrollbar with a transparent track and rounded pill aesthetics matching the parchment theme, where moving the cursor over the navigation pane does not change the scrollbar color, hovering specifically over the scrollbar thumb transitions to a terracotta highlight, and clicking/dragging the thumb darkens it for clear active tactile feedback in both light and dark modes

#### Scenario: Mobile syllabus drawer trigger and toggle
- **WHEN** a user views a note on a mobile viewport (width < 768px)
- **THEN** the syllabus sidebar is hidden by default leaving the reader pane at full width, and clicking the syllabus trigger in the navigation bar opens the syllabus as an off-canvas drawer with backdrop overlay

#### Scenario: Close mobile syllabus drawer on selection or backdrop tap
- **WHEN** the mobile syllabus drawer is open and the user clicks a note link or taps the backdrop overlay
- **THEN** the syllabus drawer closes smoothly and returns focus to the reader pane

