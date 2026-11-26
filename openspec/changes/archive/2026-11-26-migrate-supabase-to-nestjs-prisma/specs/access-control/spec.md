# Spec Delta

## MODIFIED Requirements

### Requirement: User authentication and profile creation
The system SHALL authenticate users via Firebase Auth and verify credentials on the NestJS backend to automatically initialize a corresponding public user profile in PostgreSQL via Prisma with default contributor privileges.

#### Scenario: User signs in for the first time
- **WHEN** user authenticates via Firebase Google sign-in and sends their ID token to the backend
- **THEN** NestJS verifies the token and provisions a new profile record in PostgreSQL with default contributor role and username metadata without granting administrative or editorial permissions

### Requirement: Row Level Security enforcement
The NestJS backend and Prisma data layer SHALL enforce server-side authorization guards allowing course creation exclusively by Super Admin, and note/module updates strictly by Super Admin or assigned Course Editors.

#### Scenario: Direct database update attempt
- **WHEN** an unauthenticated user or unauthorized contributor attempts to mutate notes, modules, or courses via REST endpoints
- **THEN** the NestJS authorization guard rejects the request with a 401 Unauthorized or 403 Forbidden status code
