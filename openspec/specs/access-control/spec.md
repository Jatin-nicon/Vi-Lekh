# access-control Specification

## Purpose
Enforces authentication, user profiles, role-based authorization, and database-level security policies across the platform.

## Requirements

### Requirement: User authentication and profile creation
The system SHALL authenticate users via Supabase Auth and automatically initialize a corresponding public user profile with default read-only viewer privileges.

#### Scenario: User signs in for the first time
- **WHEN** user authenticates via OAuth or email login
- **THEN** system provisions a new profile record with default reader role and username metadata without granting administrative or editorial permissions

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
- **WHEN** an authenticated user with no assigned editor membership attempts to create a course, edit a note, or access Creator Studio
- **THEN** system denies the action with an authorization failure

### Requirement: Row Level Security enforcement
The database SHALL enforce Row Level Security policies allowing course creation exclusively by Super Admin, and note/module updates strictly by Super Admin or assigned Course Editors.

#### Scenario: Direct database update attempt
- **WHEN** a general user or unassigned contributor attempts a direct update on notes, modules, or courses
- **THEN** the database RLS policy rejects the operation with an authorization failure

### Requirement: Studio navigation visibility gating
The system SHALL display the Creator Studio navigation option in the user profile menu only to users who are Super Admin or have editor membership on at least one course.

#### Scenario: Authorized user opens profile menu
- **WHEN** a user who is Super Admin or editor for at least one course opens the user menu in the navbar
- **THEN** the system displays the "Studio" navigation item linking to /studio

#### Scenario: Standard reader opens profile menu
- **WHEN** an authenticated user with no assigned editor roles opens the user menu in the navbar
- **THEN** the system does not display the "Studio" navigation item
