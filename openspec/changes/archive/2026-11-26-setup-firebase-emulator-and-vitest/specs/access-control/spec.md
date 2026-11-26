# Spec Delta

## MODIFIED Requirements

### Requirement: User authentication and profile creation
The system SHALL authenticate users via Firebase Auth (supporting both production Firebase and the local Firebase Auth Emulator) and verify credentials on the NestJS backend to automatically initialize a corresponding public user profile in PostgreSQL via Prisma with default contributor privileges.

#### Scenario: User signs in for the first time
- **WHEN** user authenticates via Firebase Google sign-in and sends their ID token to the backend
- **THEN** NestJS verifies the token and provisions a new profile record in PostgreSQL with default contributor role and username metadata without granting administrative or editorial permissions

#### Scenario: User signs in against local Firebase Auth Emulator
- **WHEN** a developer authenticates against the local Firebase Auth Emulator and sends the emulator-issued token to the NestJS backend configured with emulator support
- **THEN** NestJS validates the emulator token locally without external network dependencies and provisions or synchronizes the user profile in PostgreSQL
