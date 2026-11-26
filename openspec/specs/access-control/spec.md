# access-control Specification

## Purpose
Enforces authentication, user profiles, role-based authorization, and database-level security policies across the platform.

## Requirements

### Requirement: User authentication and profile creation
The system SHALL authenticate users via Firebase Auth (supporting both production Firebase and the local Firebase Auth Emulator) and verify credentials on the NestJS backend to automatically initialize a corresponding public user profile in PostgreSQL via Prisma with default contributor privileges.

#### Scenario: User signs in for the first time
- **WHEN** user authenticates via Firebase Google sign-in and sends their ID token to the backend
- **THEN** NestJS verifies the token and provisions a new profile record in PostgreSQL with default contributor role and username metadata without granting administrative or editorial permissions

#### Scenario: User signs in against local Firebase Auth Emulator
- **WHEN** a developer authenticates against the local Firebase Auth Emulator and sends the emulator-issued token to the NestJS backend configured with emulator support
- **THEN** NestJS validates the emulator token locally without external network dependencies and provisions or synchronizes the user profile in PostgreSQL

### Requirement: Role-based permissions
The system SHALL enforce a permission model distinguishing Super Admin, Course Editors, and general authenticated readers.

#### Scenario: Verify Core Team privilege
- **WHEN** user performs an action requiring elevated privileges (such as creating a course or modifying syllabus)
- **THEN** system verifies the user is Super Admin (for course creation/collaborator management) or assigned Course Editor (for course content editing) before executing the action

#### Scenario: Super Admin performs global administrative actions
- **WHEN** the user authenticated as admin@vilekh.local creates a course, modifies any course syllabus, or manages collaborator permissions
- **THEN** system verifies Super Admin identity and permits the administrative action

#### Scenario: Course Editor performs course-level modifications
- **WHEN** an authenticated user who is assigned as an editor in course_members for course X updates modules or notes belonging to course X
- **THEN** system verifies active editor membership for course X and permits the modification

#### Scenario: General authenticated reader attempts unauthorized authoring
- **WHEN** an authenticated user with no assigned editor membership attempts to create a course, edit a note, or access Creator Studio
- **THEN** system denies the action with an authorization failure

### Requirement: Row Level Security enforcement
The NestJS backend and Prisma data layer SHALL enforce server-side authorization guards allowing course creation exclusively by Super Admin, and note/module updates strictly by Super Admin or assigned Course Editors.

#### Scenario: Direct database update attempt
- **WHEN** an unauthenticated user or unauthorized contributor attempts to mutate notes, modules, or courses via REST endpoints
- **THEN** the NestJS authorization guard rejects the request with a 401 Unauthorized or 403 Forbidden status code

### Requirement: Studio navigation visibility gating
The system SHALL display the Creator Studio navigation option in the user profile menu only to users who are Super Admin or have editor membership on at least one course.

#### Scenario: Authorized user opens profile menu
- **WHEN** a user who is Super Admin or editor for at least one course opens the user menu in the navbar
- **THEN** the system displays the "Studio" navigation item linking to /studio

#### Scenario: Standard reader opens profile menu
- **WHEN** an authenticated user with no assigned editor roles opens the user menu in the navbar
- **THEN** the system does not display the "Studio" navigation item
