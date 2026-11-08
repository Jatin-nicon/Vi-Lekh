# Spec Delta

## Purpose

Enforces authentication, user profiles, role-based authorization, and database-level security policies across the platform.

## ADDED Requirements

### Requirement: User authentication and profile creation
The system SHALL authenticate users via Supabase Auth and automatically initialize a corresponding public user profile.

#### Scenario: User signs in for the first time
- **WHEN** user authenticates via OAuth or email login
- **THEN** system provisions a new profile record with default contributor role and username metadata

### Requirement: Role-based permissions
The system SHALL distinguish between Core Team members and community contributors, enforcing administrative privileges accordingly.

#### Scenario: Verify Core Team privilege
- **WHEN** user performs an action requiring elevated privileges (such as approving a revision or creating a course)
- **THEN** system verifies the user has the Core Team role in their profile before executing the action

### Requirement: Row Level Security enforcement
The database SHALL enforce Row Level Security policies preventing unauthorized modification of notes, revisions, and profiles.

#### Scenario: Direct database update attempt
- **WHEN** a contributor user attempts a direct update on the active revision pointer of a note
- **THEN** the database RLS policy rejects the operation with an authorization failure

