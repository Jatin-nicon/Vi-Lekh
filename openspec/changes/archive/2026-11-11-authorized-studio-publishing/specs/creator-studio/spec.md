# Spec Delta

## Purpose
Provides a dedicated management workspace (/studio) for the Super Admin and authorized Course Editors to curate courses, organize syllabus modules, assign collaborators, and launch direct note editing.

## ADDED Requirements

### Requirement: Studio dashboard and course access
The system SHALL provide an authorized Creator Studio workspace (/studio) displaying courses filtered according to the authenticated user's permissions.

#### Scenario: Super Admin accesses Studio
- **WHEN** the Super Admin (jatinkumar79911@gmail.com) navigates to /studio
- **THEN** the system displays all courses in the platform with course creation and management controls

#### Scenario: Course Editor accesses Studio
- **WHEN** a user who is assigned as an editor on one or more courses navigates to /studio
- **THEN** the system displays only the courses where the user has editor membership, with module and note editing actions enabled

#### Scenario: Unauthorized user accesses Studio
- **WHEN** an unauthenticated visitor or an authenticated user with no assigned editor roles navigates to /studio
- **THEN** the system denies access and redirects the user to the public home page with an unauthorized notification

### Requirement: Course creation restricted to Super Admin
The Creator Studio SHALL allow only the Super Admin to create new courses.

#### Scenario: Super Admin creates course
- **WHEN** the Super Admin submits a new course creation form in /studio
- **THEN** the system creates the course record in the database and updates the course list immediately

#### Scenario: Course Editor views course list
- **WHEN** an assigned Course Editor views the /studio course list
- **THEN** the "+ Create New Course" button is not visible or accessible to that user

### Requirement: Course collaborator management
The Creator Studio SHALL allow the Super Admin to assign and revoke Course Editor permissions by user email for any course.

#### Scenario: Super Admin assigns course editor
- **WHEN** the Super Admin adds an editor email to a course's collaborator list in /studio
- **THEN** the system assigns the editor role in course membership for that course and updates the collaborator roster

#### Scenario: Super Admin revokes course editor
- **WHEN** the Super Admin removes an editor from a course's collaborator list in /studio
- **THEN** the system removes the user's editor membership for that course immediately

### Requirement: Syllabus structure and note management in Studio
The Creator Studio SHALL allow authorized editors to manage modules, organize syllabus notes, and launch direct editing for assigned courses.

#### Scenario: Editor adds a module
- **WHEN** an authorized editor adds a module within an assigned course in /studio
- **THEN** the system saves the new module and updates the syllabus tree

#### Scenario: Editor launches direct note editing
- **WHEN** an authorized editor clicks to edit or create a note in /studio
- **THEN** the system navigates directly to the note editor with edit authority for that note

