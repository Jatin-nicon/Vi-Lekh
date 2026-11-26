# Proposal

## Why

Migrate the persistence and data access layer from Supabase to a dedicated NestJS application powered by Prisma ORM and PostgreSQL. This removes the platform's dependency on Supabase BaaS, moves database business logic and access control from client-side code to a secure server-side boundary, provides atomic database transactions, and prepares the system for standard containerized or cloud PostgreSQL deployments.

## What Changes

- **BREAKING**: Removed direct client-side Supabase PostgREST queries (`@supabase/ssr`, `@supabase/supabase-js`) and removed `src/lib/supabase/`.
- Created a new NestJS backend service in `server/` with Prisma ORM connected to PostgreSQL.
- Implemented Firebase Admin authentication in NestJS via `FirebaseAuthGuard` to verify Google ID tokens sent via `Authorization: Bearer <id_token>`.
- Defined Prisma schema (`schema.prisma`) covering all 7 models: `Profile`, `Course`, `Module`, `Note`, `Revision`, `RevisionComment`, and `CourseMember`.
- Implemented modular NestJS controllers and services for Profiles, Courses, Modules, Notes, and Revisions with server-side RBAC guards (`@Roles()`, `@CourseRoles()`) and atomic transactions.
- Created `api-client.ts` in Next.js to provide typed fetch wrappers that automatically attach the current Firebase user's ID token.
- Provided a `docker-compose.yml` for local PostgreSQL development.

## Capabilities

### New Capabilities

### Modified Capabilities
- `access-control`: Updates authentication verification from Supabase Auth to Firebase Admin ID token validation in NestJS, and replaces Supabase Row Level Security (RLS) policies with NestJS server-side role guards and Prisma transaction logic.

## Impact

- Frontend: `src/lib/data/notes-service.ts` refactored to call NestJS REST endpoints; `@supabase/ssr` and `@supabase/supabase-js` uninstalled.
- Backend: New standalone NestJS application running in `server/` on port 3001.
- Database: Standalone PostgreSQL database managed via Prisma migrations.
- Environment: Replaced `NEXT_PUBLIC_SUPABASE_*` environment variables with `NEXT_PUBLIC_API_URL` on frontend and `DATABASE_URL` / Firebase Admin credentials on backend.
