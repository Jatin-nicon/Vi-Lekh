# Tasks

## 1. Database Schema & Type Definitions

- [x] 1.1 Create migration `supabase/migrations/006_add_note_order_index.sql` adding `order_index INTEGER DEFAULT 0 NOT NULL` to `notes` with window function backfill, and verify SQL syntax
- [x] 1.2 Update `Note` interface in `src/lib/supabase/types.ts` to include `order_index: number` and verify type definitions

## 2. Data Service Layer

- [x] 2.1 Update `getCourseWithModulesAndNotes` in `src/lib/data/notes-service.ts` to order notes by `order_index ASC, created_at ASC`
- [x] 2.2 Add `reorderNotes(courseId, updates)` method in `src/lib/data/notes-service.ts` for batch note ordering persistence
- [x] 2.3 Add `updateNoteModule(noteId, moduleId, orderIndex?)` in `src/lib/data/notes-service.ts` for module reassignments and verify methods

## 3. Creator Studio Reordering UI

- [x] 3.1 Implement drag-and-drop grip handles (`GripVertical`) and Move Up (`ChevronUp`) / Down (`ChevronDown`) buttons on note rows in `src/app/studio/page.tsx`
- [x] 3.2 Add optimistic reorder state logic with boundary constraints (disabled Up for first item, disabled Down for last item) and background persistence via `reorderNotes`
- [x] 3.3 Verify drag-and-drop and arrow button reordering update local state and call service seamlessly

## 4. Module Reassignment UI

- [x] 4.1 Implement `MoveNoteModal` in `src/app/studio/page.tsx` listing all course modules and an unassigned option
- [x] 4.2 Wire double-click on note rows and the Move icon button (`FolderSync` / `FolderInput`) to open the reassignment dialog
- [x] 4.3 Add module assignment trigger for unassigned notes in the bottom unassigned section of `src/app/studio/page.tsx`
- [x] 4.4 Verify reassigning a note between modules or to/from unassigned correctly updates local state and database

## 5. Verification & Build Integrity

- [x] 5.1 Run `npm run build` and verify zero TypeScript, Next.js, or linting errors

