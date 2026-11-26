# Design

## Context

The current application relies on direct client-side Supabase PostgREST queries executing from `src/lib/data/notes-service.ts`. While user authentication is managed via Firebase Google Sign-In, database interactions and authorization checks have lived on the client. Migrating to NestJS and Prisma establishes a secure server boundary and full control over database persistence. (See `proposal.md` for motivation).

## Goals / Non-Goals

**Goals:**
- Provide a clean, modular NestJS backend in `server/` exposing REST endpoints for courses, modules, notes, revisions, and profiles.
- Model the complete database schema with Prisma ORM connecting to PostgreSQL with automated migrations.
- Verify Firebase ID tokens server-side via `firebase-admin` in `FirebaseAuthGuard` and enforce `@Roles()` and `@CourseRoles()` guards.
- Implement atomic multi-step mutations (e.g. note creation + initial revision, module reordering, course deletion) using `prisma.$transaction()`.
- Cut over Next.js data service to query the NestJS API with automatic Bearer token injection.
- Provide a `docker-compose.yml` for local PostgreSQL execution.

**Non-Goals:**
- Replacing Firebase Auth with custom credentials or email/password JWT authentication.
- Modifying the visual note editor, block converters, or reader layout.
- Splitting the backend into microservices.

## Decisions

### 1. Repository Organization: `server/` Subdirectory
- **Choice**: Place the NestJS application in a dedicated `server/` directory within this repository.
- **Rationale**: Keeps frontend and backend synchronized in version control, simplifies CI/CD, and avoids the heavy configuration overhead of multi-package monorepos.
- **Alternatives Considered**: 
  - *Full Monorepo (Turborepo/pnpm)*: Added unnecessary workspace complexity for a 2-app project.
  - *Separate Git Repository*: Separates pull requests and makes synchronized schema updates harder to coordinate.

### 2. ORM: Prisma with PostgreSQL
- **Choice**: Use Prisma ORM (`@prisma/client` and `prisma`) with PostgreSQL.
- **Rationale**: Declarative data modeling, automated schema migrations, complete TypeScript type generation, and first-class JSON support for `NoteBlock[]` storage.
- **Alternatives Considered**:
  - *TypeORM*: More verbose and prone to decorator reflection issues.
  - *Drizzle ORM*: Lightweight but requires more manual migration plumbing compared to Prisma's developer experience.

### 3. Authentication: Firebase Admin SDK via NestJS Guard
- **Choice**: Frontend passes Firebase ID tokens in `Authorization: Bearer <token>`, verified by `firebase-admin` in `FirebaseAuthGuard`.
- **Rationale**: Preserves the existing Google sign-in UX while ensuring the backend independently verifies authenticity, extracts the user UID/email, and loads the user's database role.
- **Alternatives Considered**:
  - *Custom NestJS Auth / Passport JWT*: Would require building login/signup flows and user credential management from scratch.

### 4. Data Service Cutover: Typed Frontend API Client
- **Choice**: Introduce `src/lib/api/api-client.ts` in Next.js that wraps `fetch`, automatically attaches `await auth.currentUser?.getIdToken()`, and refactor `notes-service.ts` to call these REST endpoints.
- **Rationale**: Preserves existing UI call signatures across React components while swapping the underlying transport from Supabase client to HTTP REST.

## Risks / Trade-offs

- **[Local Postgres Dependency]** → Developers need a running PostgreSQL database.  
  *Mitigation*: Provide a simple `docker-compose.yml` in `server/` with a preconfigured Postgres instance accessible via `docker compose up -d`.
- **[Firebase Token Expiration]** → Client tokens expire after 1 hour.  
  *Mitigation*: The frontend API client calls `user.getIdToken()` before each authenticated request, allowing the Firebase client SDK to automatically refresh tokens in the background.
- **[Prisma JSON Serialization]** → The `blocks` column in `Revision` stores arbitrary JSON.  
  *Mitigation*: Use strict TypeScript casting and validation DTOs (`NoteBlock[]`) in the NestJS service layer before persisting to Prisma.

## Migration Plan

1. **Scaffolding**: Create `server/` with NestJS CLI dependencies, TypeScript configuration, and ESLint.
2. **Database & Prisma**: Add `schema.prisma`, configure PostgreSQL connection, and execute initial migration.
3. **Auth & Security**: Configure `firebase-admin`, create `FirebaseAuthGuard`, `@CurrentUser()`, and role guards.
4. **API Modules**: Build controllers and services for Profiles, Courses, Modules, Notes, and Revisions.
5. **Frontend Integration**: Implement `src/lib/api/api-client.ts`, refactor `src/lib/data/notes-service.ts`, and uninstall `@supabase/*`.
6. **Verification**: Run `npm run build` on both frontend and backend, test course browsing, note creation, and live publishing.
