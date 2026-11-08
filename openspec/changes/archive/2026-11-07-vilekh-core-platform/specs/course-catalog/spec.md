# Spec Delta

## Purpose

Enables hierarchical organization, navigation, and discovery of technical knowledge across domains, courses, modules, and notes.

## ADDED Requirements

### Requirement: Hierarchical syllabus and navigation
The system SHALL organize notes within a structured hierarchy of courses and modules with a persistent navigation sidebar.

#### Scenario: View course syllabus
- **WHEN** user navigates to a course page
- **THEN** system displays the ordered list of modules and notes in that course with direct links to each note

#### Scenario: Navigate between notes
- **WHEN** user selects a note from the navigation sidebar
- **THEN** system loads the selected note content while preserving navigation context and breadcrumb trail

### Requirement: Full-text and title search
The system SHALL provide a search interface allowing users to find notes and topics by title, keywords, and course associations.

#### Scenario: Search for topic
- **WHEN** user types a query into the global search bar
- **THEN** system displays matching notes with course badges and matching text snippets

### Requirement: Course and note management for Core Team
The system SHALL restrict the creation and reordering of courses, modules, and note entries to Core Team members.

#### Scenario: Contributor attempts to create course
- **WHEN** a contributor without Core Team role attempts to create a new course
- **THEN** system rejects the request with an authorization error

