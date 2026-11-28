# Spec Delta

## MODIFIED Requirements

### Requirement: Role-based permissions
The system SHALL enforce a permission model distinguishing Super Admin, Course Editors, and general authenticated readers.

#### Scenario: Verify Core Team privilege
- **WHEN** user performs an action requiring elevated privileges (such as creating a course or modifying syllabus)
- **THEN** system verifies the user is Super Admin (for course creation/collaborator management) or assigned Course Editor (for course content editing) before executing the action

#### Scenario: Super Admin performs global administrative actions
- **WHEN** the user authenticated as jatinkumar79911@gmail.com creates a course, modifies any course syllabus, or manages collaborator permissions
- **THEN** system verifies Super Admin identity and permits the administrative action

#### Scenario: Course Editor performs course-level modifications
- **WHEN** an authenticated user who is assigned as an editor in course_members for course X updates modules or notes belonging to course X
- **THEN** system verifies active editor membership for course X and permits the modification

#### Scenario: General authenticated reader attempts unauthorized authoring
- **WHEN** an authenticated user with no assigned editor membership attempts to create a course, publish or directly edit a note, review a suggestion, restore a version, or access Creator Studio
- **THEN** system denies the action with an authorization failure

#### Scenario: General authenticated reader suggests edits
- **WHEN** an authenticated user with no assigned editor membership creates, saves, submits or withdraws their own suggestion draft for any note
- **THEN** system permits the action without publishing anything to the note

#### Scenario: Course reviewer acts on suggestions and history
- **WHEN** the Super Admin or an admin or editor of course X merges, saves as copy, rejects or requests changes on a suggestion for a note in course X, or restores a version of such a note
- **THEN** system permits the action

### Requirement: Row Level Security enforcement
The database SHALL identify the caller from their verified sign-in token and SHALL enforce Row Level Security that allows course creation only by the Super Admin, note and module updates only by the Super Admin or assigned Course Editors, and suggestion, annotation, review and restore writes only as described in the role-based permissions.

#### Scenario: Direct database update attempt
- **WHEN** a general user or unassigned contributor attempts a direct update on notes, modules, or courses
- **THEN** the database RLS policy rejects the operation with an authorization failure

#### Scenario: Forged reviewer action
- **WHEN** a general user sends a request directly to the database that sets one of their suggestions to merged or points a note's current version at it
- **THEN** the database rejects the operation

#### Scenario: Unauthenticated write
- **WHEN** a request without a valid sign-in token attempts to insert or update suggestions, annotations or versions
- **THEN** the database rejects the operation

#### Scenario: Writing on behalf of another user
- **WHEN** a signed-in user attempts to create a suggestion or annotation whose author is a different user
- **THEN** the database rejects the operation
