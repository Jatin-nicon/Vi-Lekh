# Tasks

## 1. Data Models & Block Serialization

- [x] 1.1 Extend `NoteBlock` in `src/lib/supabase/types.ts` with `"flow" | "your_note" | "card_grid" | "round_dialogue" | "pinned_note"`; verify TypeScript types compile.
- [x] 1.2 Update `src/lib/editor/block-converter.ts` with bidirectional HTML/block conversion for process flows, student reflection notes, card grids, prompt rounds, and pinned notes; verify parser logic with unit block structures.

## 2. TipTap Pedagogical Node Extensions

- [x] 2.1 Implement `ProcessFlow` TipTap extension and React node view in `src/components/editor/extensions/process-flow.tsx`; verify step addition, editing, and highlight toggling in the editor.
- [x] 2.2 Implement `YourNote` TipTap extension and React node view in `src/components/editor/extensions/your-note.tsx`; verify prompt editing and lined paper preview in the editor.
- [x] 2.3 Implement `CardGrid` TipTap extension and React node view in `src/components/editor/extensions/card-grid.tsx`; verify 2-column card authoring and semantic accent borders in the editor.
- [x] 2.4 Implement `PromptRound` and `PinnedNote` TipTap extensions in `src/components/editor/extensions/`; verify round number inputs and amber sticky card rendering in the editor.
- [x] 2.5 Register the new extensions in `src/components/editor/rich-editor.tsx` and add slash command shortcuts (`/flow`, `/your-note`, `/cards`, `/round`, `/pinned`) in `src/components/editor/extensions/slash-items.ts`; verify palette triggers.

## 3. Reader Presentation & Print Styles

- [x] 3.1 Implement pedagogical rendering components in `src/components/reader/note-reader.tsx` for process flows, reflection boxes, card grids, prompt rounds, and pinned cards; verify screen rendering.
- [x] 3.2 Implement student reflection note-taking interactivity in `NoteReader` with `localStorage` persistence; verify saved input between page reloads.
- [x] 3.3 Add optional worksheet mode header in `NoteReader` displaying student Name and Date blanks; verify header layout.
- [x] 3.4 Implement CSS rules for notebook writing lines, responsive flow arrows, and print worksheet fidelity in `src/app/globals.css`; verify `@media print` layout.

## 4. Verification & Integration

- [x] 4.1 Run `npm run build` and verify 0 TypeScript/Turbopack errors and clean route operation.

## Workflow follow-up

- Archive the change after user testing and review.
- Sync updated specs with main capability specifications.

