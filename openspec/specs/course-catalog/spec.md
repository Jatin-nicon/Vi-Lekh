# course-catalog Specification

## Purpose
Enables hierarchical organization, navigation, and discovery of technical knowledge across domains, courses, modules, and notes.

## Requirements

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

### Requirement: Full-text and title search
The system SHALL provide a search interface allowing users to find notes and topics by title, keywords, and course associations.

#### Scenario: Search for topic
- **WHEN** user types a query into the global search bar
- **THEN** system displays matching notes with course badges and matching text snippets

### Requirement: Course and note management for Core Team
The system SHALL separate administrative course creation and syllabus management from the public catalog, restricting course creation to Super Admin and syllabus management to authorized editors within /studio.

#### Scenario: Contributor attempts to create course
- **WHEN** a contributor or user other than the Super Admin attempts to create a new course
- **THEN** system rejects the request with an authorization error

#### Scenario: Non-Super Admin views public catalog
- **WHEN** any user views the public course catalog at /
- **THEN** the system does not render course creation, course deletion, or collaborator management controls

### Requirement: Pure public catalog interface
The root catalog page (/) SHALL provide a distraction-free course discovery interface featuring search and category filters with direct navigation to read-only course syllabi.

#### Scenario: Visitor explores courses
- **WHEN** a user visits the root URL /
- **THEN** the system displays course cards with title, description, domain badge, and a link to open the notes reader, without administrative or editor action buttons
