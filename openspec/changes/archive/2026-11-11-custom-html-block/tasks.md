# Tasks

## 1. Types & Serialization Support

- [x] 1.1 Add `"html"` to `NoteBlock["type"]` union in `src/lib/supabase/types.ts` and verify TypeScript definitions compile cleanly
- [x] 1.2 Implement bidirectional HTML block conversion in `src/lib/editor/block-converter.ts` (`htmlToBlocks` and `blocksToHtml`) with safe attribute encoding and verify roundtrip serialization fidelity

## 2. TipTap Extension & Slash Command

- [x] 2.1 Create `HtmlBlockExtension` with React NodeView in `src/components/editor/extensions/html-block.tsx` featuring monospace textarea, in-card `Edit Code` ⇄ `Preview Output` toggle, and placeholder guidance
- [x] 2.2 Register `HtmlBlockExtension` in the editor extensions list within `src/components/editor/rich-editor.tsx`
- [x] 2.3 Register the `/html` slash command in `src/components/editor/extensions/slash-items.ts` with code icon, description, and search aliases (`raw-html`, `embed`, `custom-html`)
- [x] 2.4 Fix leaf node DOM serialization in `HtmlBlockExtension` (and workbook atom extensions) by removing content hole `0` from `renderHTML`

## 3. Reader & Print Export Rendering

- [x] 3.1 Update `src/components/reader/note-reader.tsx` to render `"html"` blocks inside a scoped container with print break-avoidance styling (`print:break-inside-avoid`)
- [x] 3.2 Update `src/components/editor/live-preview.tsx` to render `"html"` blocks in the live reader simulation

## 4. Verification & Build

- [x] 4.1 Run `npm run build` and verify the Next.js production build succeeds with all types and extensions passing type-checking
- [x] 4.2 Verify `editor.getHTML()` serialization without `RangeError` and confirm live preview and reader render custom HTML correctly

