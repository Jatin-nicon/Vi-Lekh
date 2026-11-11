# Spec Delta

## MODIFIED Requirements

### Requirement: Structured block serialization
The system SHALL serialize document content as structured JSON blocks and persist changes directly to the live published note without intermediate review proposals.

#### Scenario: Save document content
- **WHEN** an authorized editor or Super Admin submits note content for saving
- **THEN** the system converts the editor canvas state into a valid JSON block array and updates the live note record immediately

## ADDED Requirements

### Requirement: Note editor route authorization
The note editor route (/edit) SHALL restrict access exclusively to the Super Admin and designated Course Editors for the corresponding course.

#### Scenario: Authorized editor opens note in editor
- **WHEN** the Super Admin or an assigned Course Editor accesses /edit?note=<id>
- **THEN** the system renders the block editor canvas loaded with the note's current content

#### Scenario: Unauthorized user attempts to access editor
- **WHEN** a visitor or an authenticated user who is not an editor for that note's course accesses /edit?note=<id>
- **THEN** the system blocks editor access and redirects the user with an unauthorized access notification

