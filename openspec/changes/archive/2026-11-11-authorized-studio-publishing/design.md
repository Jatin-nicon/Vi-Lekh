# Design

## Context

Vi-Lekh is a full-stack Next.js (App Router) application with Tailwind CSS and Supabase. The platform provides structured technical notes organized by courses and modules. Previously, Vi-Lekh featured an open collaboration model where any logged-in user could submit edit suggestions into a review queue (`/reviews`). 

To position Vi-Lekh as an authoritative knowledge repository, this model is being replaced with an authorized Creator Studio (`/studio`) and direct live publishing.

Key existing foundations in the codebase:
- `SUPER_ADMIN_EMAIL`: Defined as `admin@vilekh.local`.
- `course_members` table: Links `course_id`, `user_id`, and `role` (`'admin' | 'editor'`).
- `notes-service.ts`: Houses Supabase operations for courses, modules, notes, and course memberships.

## Goals / Non-Goals

**Goals:**
- Provide a pure, distraction-free reading experience across public catalog (`/`) and reader (`/notes`).
- Establish a single, centralized management surface (`/studio`) accessible exclusively to authorized editors.
- Restrict course creation strictly to the Super Admin (`admin@vilekh.local`).
- Enable the Super Admin to delegate course editing privileges to specific users via email through `course_members`.
- Allow assigned Course Editors to manage syllabus modules, notes, and direct edits for their assigned courses.
- Save and publish note edits immediately live without review queue intermediation.
- Decommission the `/reviews` route, review badge counters, and public suggestion UI.

**Non-Goals:**
- Destructive removal of existing database tables (`revisions` can remain as an inert audit log without affecting current operations).
- Modifying block editor formatting capabilities (BlockNote, KaTeX math rendering, and code syntax highlighting remain unchanged).
- Re-architecting Supabase authentication.

## Decisions

### Decision 1: Creator Studio (`/studio`) Architecture & Permissions

**Approach:** Build a dedicated `/studio` dashboard page with modular view management.
- **Access Gate:** The page checks user authentication and authorization:
  - If user is Super Admin: Full access granted (sees all courses, can create courses, can manage collaborators for any course, can edit all notes).
  - If user has editor roles in `course_members`: Scoped access granted (sees only assigned courses, can manage syllabus structure and edit notes within assigned courses; cannot create courses or manage collaborators).
  - Otherwise (unauthenticated or standard reader): Redirect to `/` with an unauthorized alert message.
- **Studio Layout:**
  - Sidebar / Course Selector: List of accessible courses, plus a prominent "+ New Course" button visible **only** to the Super Admin.
  - Selected Course Panel:
    - Course metadata overview.
    - Syllabus Manager: Add/reorder/rename modules, add/reorder/delete notes.
    - Collaborator Manager (Super Admin only): View current course editors, add editor by email, and revoke editor access.
    - Actions: "Open in Reader" and "Edit Note" (launches direct note editing).

*Alternatives Considered:* Embedding administrative controls directly into the public `/` or `/notes` pages with role conditionals. Rejected because it clutters the reader experience and leaks administrative UI onto public surfaces.

### Decision 2: Direct Live Publishing & Deprecation of Review Queue

**Approach:** 
- In `src/app/edit/page.tsx`, the editor operates exclusively in direct publish mode.
- When an authorized editor clicks "Save Note" or "Publish", the editor updates the note record in Supabase directly via `updateNote(noteId, { title, content })`.
- Remove proposal creation (`createRevision`), diff review dashboard (`/reviews`), review queues, and approval workflows.
- Delete `src/app/reviews/page.tsx` and eliminate pending review counters from navigation bars.

*Alternatives Considered:* Retaining a private draft status for notes. Postponed for simplicity since authorized editors directly maintain production notes; direct live publishing fulfills the user's explicit Option A choice.

### Decision 3: Route Guarding for Editor (`/edit`)

**Approach:**
- Upon loading `/edit?note=<id>`, fetch note metadata to determine its `course_id`.
- Verify user authorization:
  - User is Super Admin (`user.email === 'admin@vilekh.local'`), OR
  - User is an active editor for that course in `course_members`.
- If unauthorized, render a clean error state or redirect back to `/notes?course=<courseId>&note=<noteId>`.

*Alternatives Considered:* Client-only check without verifying course membership. Rejected because editors must only edit notes belonging to courses they are assigned to.

### Decision 4: Distraction-Free Public Reader Surface

**Approach:**
- In `src/app/page.tsx` (Public Catalog):
  - Remove all administrative buttons: "+ Create New Course", "Manage Access", "Delete Course", and editor tags.
  - Retain high-quality search, category filters, course metadata, and clear "Open Syllabus & Notes →" action.
- In `src/components/reader/note-reader.tsx` and `src/app/notes/page.tsx`:
  - Remove "Suggest Edits" buttons, "Suggest an Edit" callout banners, and revision history modal.
  - Pure reading surface with sidebar syllabus, breadcrumbs, search, and table of contents.
- In `src/components/auth/user-menu.tsx`:
  - Dynamically check if the logged-in user is Super Admin or assigned to $\ge 1$ course.
  - If authorized, show "Creator Studio" menu item pointing to `/studio`.
  - If not authorized, user menu only shows profile details and Sign Out.

## Risks / Trade-offs

- **[Risk: Stale local storage or cached session privileges]** → Mitigation: Permissions are computed deterministically from `user.email` (Super Admin check) and active `course_members` records in Supabase. Cleared all legacy mock roles.
- **[Risk: User bookmarks `/reviews` or `/edit` directly]** → Mitigation: `/reviews` route is removed; `/edit` route implements strict authorization checks and redirects unauthorized visitors.
- **[Risk: Inviting an editor by email who hasn't registered yet]** → Mitigation: The collaborator manager looks up user ID by email in `profiles`; if not registered, displays a clear instruction: "The user must sign in to Vi-Lekh once before they can be added as an editor."

## Migration Plan

1. Verify and enhance `notes-service.ts` to support fetching user's editable courses, course collaborator management, and direct note publishing.
2. Build Creator Studio at `src/app/studio/page.tsx` with course list, syllabus manager, and collaborator manager.
3. Clean up root `/` page to remove administrative controls.
4. Clean up `/notes` reader to remove suggestion UI and review banners.
5. Guard `/edit` route for Super Admin and assigned Course Editors.
6. Delete `/reviews` page and remove review links from `Navbar` and `UserMenu`.
7. Add Studio navigation entry to `UserMenu` for authorized users.

