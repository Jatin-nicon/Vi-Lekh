# Tasks

## 1. Backend Scaffolding & Database Setup

- [x] 1.1 Scaffold NestJS application in `server/` with TypeScript configuration and verify `npm run build` succeeds
- [x] 1.2 Add `docker-compose.yml` in `server/` with PostgreSQL 16 service and verify container starts up cleanly
- [x] 1.3 Install and initialize Prisma ORM in `server/`, author `schema.prisma` with all 7 models (`Profile`, `Course`, `Module`, `Note`, `Revision`, `RevisionComment`, `CourseMember`), and generate Prisma Client
- [x] 1.4 Execute initial Prisma migration against the PostgreSQL database and verify all 7 tables and enums are created

## 2. Authentication & Server-Side Security Guards

- [x] 2.1 Integrate `firebase-admin` in NestJS `AuthModule` and verify credentials initialize without errors
- [x] 2.2 Implement `FirebaseAuthGuard` to extract and verify the `Authorization: Bearer <id_token>` header and attach decoded user claims to `request.user`
- [x] 2.3 Implement `@CurrentUser()` parameter decorator and verify it injects authenticated user data into controller routes
- [x] 2.4 Implement `RolesGuard` (`UserRole`) and `CourseRoleGuard` (`CourseRole`) to restrict administrative and editorial endpoints, verifying unauthorized requests return 401/403

## 3. Core Domain REST API Modules

- [x] 3.1 Implement `ProfilesModule` (profile sync on login, profile lookup, username check) and verify endpoints return profile records
- [x] 3.2 Implement `CoursesModule` (list courses with stats, get course with modules/notes, create course, delete course, manage course members) with Prisma queries and verify CRUD operations
- [x] 3.3 Implement `ModulesModule` (create module, update title, delete module, reorder module index) and verify module endpoints
- [x] 3.4 Implement `NotesModule` (create note with initial revision in transaction, update note title/module, delete note, direct live publish) and verify note endpoints
- [x] 3.5 Implement `RevisionsModule` (create revision, list revisions, status transitions, comments) and verify revision endpoints

## 4. Frontend Integration & Supabase Removal

- [x] 4.1 Create `src/lib/api/api-client.ts` in Next.js with typed HTTP fetch wrappers that automatically inject `auth.currentUser.getIdToken()` Bearer token
- [x] 4.2 Refactor `src/lib/data/notes-service.ts` to call NestJS REST endpoints for all catalog, note, and studio operations
- [x] 4.3 Remove `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`, and retain local types in `src/lib/types/`
- [x] 4.4 Uninstall `@supabase/ssr` and `@supabase/supabase-js` from `package.json` and remove Supabase environment variables from `.env.local`

## 5. End-to-End Verification

- [x] 5.1 Run `npm run build` in `server/` and verify the NestJS build passes with 0 TypeScript errors
- [x] 5.2 Run `npm run build` in root and verify the Next.js production build completes with 0 errors
- [x] 5.3 Test full end-to-end user workflows: Google Sign-in profile sync, course catalog browsing, note rendering, note creation in Studio, and direct live publishing
