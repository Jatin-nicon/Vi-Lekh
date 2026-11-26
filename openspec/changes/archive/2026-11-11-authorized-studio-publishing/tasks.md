# Tasks

## 1. Data Layer & Access Helpers

- [x] 1.1 Add helper functions in `src/lib/data/notes-service.ts` to fetch editable courses for a user, look up profiles by email, assign/revoke course editors in `course_members`, and update live notes directly without revisions; verify via TypeScript compilation.
- [x] 1.2 Implement access authorization utilities in `src/lib/auth/roles.ts` to determine Super Admin (`admin@vilekh.local`), course editor status, and Studio access eligibility; verify unit exports and type signatures.

## 2. Public Surface Cleanup & Review Deprecation

- [x] 2.1 Refactor root catalog `src/app/page.tsx` to remove "+ Create New Course", "Manage Access", and "Delete Course" actions, ensuring a clean public reader catalog; verify by inspecting rendered DOM and route compilation.
- [x] 2.2 Clean reader components in `src/app/notes/page.tsx` and `src/components/reader/note-reader.tsx` to remove "Suggest Edits" buttons, community suggestion callouts, and revision history modal; verify reader renders strictly in read-only mode.
- [x] 2.3 Delete review dashboard page `src/app/reviews/page.tsx` and remove review badges/links from `src/components/layout/navbar.tsx`; verify that no dangling imports or broken links remain.

## 3. Creator Studio Workspace (`/studio`)

- [x] 3.1 Create Creator Studio page at `src/app/studio/page.tsx` with route-level authorization that redirects unauthenticated and non-editor users to `/`; verify unauthorized redirect behavior.
- [x] 3.2 Build Studio course selector and Super Admin course creation modal in `/studio`, ensuring only the Super Admin can create courses; verify course creation and scoped course list display.
- [x] 3.3 Build course syllabus manager in `/studio` to create, rename, and delete modules and notes for assigned courses; verify module and note updates persist.
- [x] 3.4 Build collaborator management modal in `/studio` allowing Super Admin to assign and revoke course editors by user email; verify membership records update in `course_members`.

## 4. Note Editor Guarding & Direct Publishing (`/edit`)

- [x] 4.1 Update note editor page `src/app/edit/page.tsx` to enforce course-level authorization (Super Admin or assigned Course Editor) and redirect unauthorized attempts; verify access gate for both authorized and unauthorized states.
- [x] 4.2 Update save handler in `src/app/edit/page.tsx` to write directly to live note records via `updateNote`, removing all proposal/revision queue code; verify note edits save and display immediately on `/notes`.

## 5. Navigation & End-to-End Verification

- [x] 5.1 Update `src/components/auth/user-menu.tsx` to display a "Creator Studio" link in the dropdown menu exclusively for Super Admin and assigned Course Editors; verify menu items for reader vs editor accounts.
- [x] 5.2 Run full application build (`npm run build`) and verify complete TypeScript compilation, zero broken links, and clean separation between reader view and studio workspace.

## Workflow follow-up

- Archive the change after implementation and user acceptance testing.
- Sync updated specs with main capability specifications.

