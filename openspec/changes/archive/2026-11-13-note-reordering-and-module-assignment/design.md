# Design

## Context

In Vi-Lekh, courses contain syllabus modules (`modules`) and lecture notes (`notes`). While the `modules` table includes an `order_index` column, the `notes` table previously lacked an ordering column and sorted exclusively by `created_at ASC`. Course editors curating materials in `/studio` could not change the sequence of lectures or move notes across modules after creation.

## Goals / Non-Goals

**Goals:**
- Add `order_index` to the `notes` table with seamless backward compatibility and automated backfill.
- Implement hybrid reordering in `/studio`: HTML5 drag-and-drop handles for fluid reordering plus accessible Move Up and Move Down buttons.
- Implement a Note Module Reassignment dialog triggered by double-clicking a note row or clicking a dedicated "Move" button.
- Support moving unassigned notes into syllabus modules and unassigning module notes.
- Provide instant optimistic UI feedback while synchronizing ordering and module changes to Supabase in the background.
- Ensure the reader view (`/notes`) and course catalog display notes in the curated `order_index` sequence.

**Non-Goals:**
- Moving notes between different courses (notes remain bound to their parent `course_id`).
- Multi-note selection or bulk-action batch operations.
- Complex external drag-and-drop libraries (native HTML5 drag-and-drop avoids bundle bloat and React 19 compatibility issues).

## Decisions

### 1. Database Schema & Backfill
- **Choice**: Add `order_index INTEGER DEFAULT 0 NOT NULL` to `public.notes`.
- **Backfill Strategy**: Use a window function partitioned by `(course_id, module_id)` ordered by `created_at ASC` so existing notes preserve their current sequence as initial dense indices `0, 1, 2, ...`.
- **Rationale**: Dense integer indexing is straightforward to manipulate in UI state arrays and avoids floating-point precision issues.

### 2. Hybrid Reordering Interaction
- **Choice**: Native HTML5 Drag-and-Drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) paired with Move Up (`▲`) and Move Down (`▼`) buttons.
- **Rationale**:
  - Drag-and-drop offers immediate visual convenience on desktop.
  - Up/Down buttons provide an accessible, tactile, single-click fallback for touch screens, trackpads, and keyboard users.
  - Up button is disabled on the first item; Down button is disabled on the last item.

### 3. Module Reassignment Trigger and Modal
- **Choice**: Dual trigger — double-clicking anywhere on a note row (outside interactive inputs) OR clicking the "Move Note" icon button (`FolderSync` / `FolderInput`) opens a dedicated `MoveNoteModal`.
- **Rationale**:
  - Double-click is natural and rapid for desktop power users.
  - The icon button provides high visibility and touch accessibility on mobile devices.
  - A modal selector containing all course modules plus an "Unassigned / General" option makes cross-module transfers explicit, eliminating clumsy multi-container drag-and-drop across long scroll views.

### 4. Optimistic State & Persistence Strategy
- **Choice**:
  - When reordering within a module: immediately reorder the local `notes` array in `/studio` and assign updated `order_index` values.
  - In the background, call `notesService.reorderNotes(courseId, updates)` which executes batch updates in Supabase.
  - If a network error occurs, revert the local state and display a toast notification.
  - When reassigning module: update `note.module_id`, assign the next available `order_index` in the destination module, and call `notesService.updateNoteModule(noteId, moduleId, newOrderIndex)`.

## Risks / Trade-offs

- **[Unmigrated database instances]** → If Supabase has not yet run `006_add_note_order_index.sql`, queries falling back to `created_at` ensure the application does not crash.
- **[Concurrent edits by multiple course collaborators]** → Last-write-wins on `order_index`. If an editor reloads `/studio`, the latest sequence from the server is displayed.
- **[Drag & drop event conflicts with text selection or row clicks]** → Drag handle (`GripVertical`) acts as the designated drag target or draggable container, preventing accidental drags during double-clicks.

