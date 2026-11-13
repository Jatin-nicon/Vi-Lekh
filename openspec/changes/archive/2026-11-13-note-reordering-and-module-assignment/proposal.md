# Proposal

## Why

Currently, lecture notes within courses and syllabus modules in Creator Studio are ordered solely by their `created_at` creation timestamp, with no mechanism for educators and course editors to reorder notes or move notes between modules. As courses evolve, creators must be able to organize notes in pedagogical order and restructure module assignments without deleting and recreating notes.

## What Changes

- **Note Order Index Schema**: Add `order_index INTEGER DEFAULT 0 NOT NULL` to the `notes` table in Supabase and backfill existing notes sorted by `created_at`.
- **Hybrid Note Reordering in Creator Studio**: Provide drag-and-drop grip handles (`GripVertical`) for visual ordering plus Move Up (`▲`) and Move Down (`▼`) buttons on each note item for quick, accessible single-step reordering.
- **Note Module Reassignment**: Allow course editors to reassign any note to another module or to unassigned status via a dedicated Move dialog, triggered either by double-clicking a note row or clicking the "Move Note" action button.
- **Automatic Optimistic State & Persistence**: Instantly update the local UI on reordering or reassignment, and synchronize the changes to Supabase via batch updates in the background.
- **Catalog & Reader Sequence Alignment**: Ensure `notesService.getCourseWithModulesAndNotes` orders notes by `order_index ASC, created_at ASC` so student-facing reading views match the curated creator sequence.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `creator-studio`: Add requirements for note reordering (drag-and-drop and up/down buttons) and module reassignment within the Creator Studio workspace.

## Impact

- **Database**: New migration `supabase/migrations/006_add_note_order_index.sql` adding `order_index` column to `public.notes` with partition-based backfill.
- **Types**: `src/lib/supabase/types.ts` updated to include `order_index: number` in the `Note` interface.
- **Services**: `src/lib/data/notes-service.ts` updated with `reorderNotes()` batch update, `updateNoteModule()`, and sorting by `order_index ASC, created_at ASC`.
- **UI Components**: `src/app/studio/page.tsx` updated with reorder handles, up/down arrows, and a module reassignment modal dialog.

