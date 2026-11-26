# Proposal

## Why

Vi-Lekh previously allowed any authenticated user to edit notes or submit edit suggestions into a collaborative review queue. However, as an authoritative technical knowledge base, open public edits and suggestion queues introduce administrative overhead, review backlogs, and content inconsistency. The system must transition to a clean, authoritative publishing model where general visitors and authenticated users enjoy a distraction-free, read-only experience, while content authoring and course management are restricted to an authorized Creator Studio (`/studio`) accessible only by the Super Admin and designated course editors.

## What Changes

- **Pure Reader Experience on Public Routes**:
  - The root catalog (`/`) is strictly a public reader view with search and filter controls. The "+ Create New Course", "Manage Access", and "Delete Course" actions are removed from the public page.
  - The reader page (`/notes?course=...`) is strictly read-only. The "Suggest Edits" buttons, revision history view, and community contribution banners are removed.
- **Creator Studio (`/studio`)**:
  - Introduce a dedicated `/studio` management dashboard accessible from the user profile menu in the navbar.
  - Gated to authorized users only: the Super Admin and users assigned as editors on one or more courses.
  - Super Admin sees all courses, can create new courses, manage course collaborators (assign/remove course editors), delete courses, and edit all course content.
  - Course Editors see only the courses they are assigned to, and can add/reorder modules, add/reorder notes, and edit notes directly.
- **Super Admin-Only Course Creation**:
  - Course creation is strictly restricted to the Super Admin (`admin@vilekh.local`). Course editors can manage modules and notes within their assigned courses, but cannot create new courses.
- **Removal of Community Suggestion & Review Workflow (**BREAKING**)**:
  - The `/reviews` page and review queue are removed.
  - Community edit suggestions are eliminated. Non-editor users cannot propose revisions or edit notes.
  - Direct live publishing: When an authorized editor or Super Admin updates a note in the editor, changes are saved and published directly to live without going through a proposal or review queue.
- **Access Control Updates**:
  - Super Admin identified by fixed email `admin@vilekh.local`.
  - Scoped course permissions via `course_members` (`role = 'editor' | 'admin'`).
  - Standard authenticated users default to pure read access with no editor or reviewer privileges.

## Capabilities

### New Capabilities
- `creator-studio`: Dedicated workspace (`/studio`) for Super Admin and designated Course Editors to manage course syllabi, modules, notes, and course-level editor assignments.

### Modified Capabilities
- `access-control`: Restricts course creation to Super Admin, gates `/studio` access to authorized maintainers, removes public contributor edit permissions, and enforces course-scoped editor authorization.
- `course-catalog`: Separates public browsing from course administration. Root `/` becomes a distraction-free public catalog, and `/notes` becomes a pure reader view.
- `note-editor`: Restricts `/edit` access to Super Admin and assigned Course Editors, and persists note edits directly to live without review queue intermediate states.
- `review-workflow`: Deprecates and removes community suggestion queues, review routing, visual diff review dashboard, and pending approval flows.

## Impact

- **UI / Frontend**:
  - Root `/` page (`src/app/page.tsx`): Cleared of administrative buttons ("+ Create New Course", "Manage Access", "Delete Course", edit status tags).
  - Reader page (`src/app/notes/page.tsx`, `src/components/reader/note-reader.tsx`): Removed "Suggest Edits" action, "Suggest an Edit" callouts, and revision history viewer.
  - Review dashboard (`src/app/reviews/page.tsx`): Route deleted; review navigation removed from `Navbar`.
  - User Menu (`src/components/auth/user-menu.tsx`): Displays a direct "Studio" link for Super Admin and assigned Course Editors.
  - New route `/studio` (`src/app/studio/page.tsx`): Dedicated management UI for authorized course creators and editors.
  - Editor page (`src/app/edit/page.tsx`): Route guarded against unauthorized access; saves directly to live notes.
- **Backend / Data Layer**:
  - `notes-service.ts`: Update functions to enforce Super Admin course creation and direct note publishing; retire suggestion submission and review approval helper functions.
  - `course_members` table: Powers course-level editor assignments.

