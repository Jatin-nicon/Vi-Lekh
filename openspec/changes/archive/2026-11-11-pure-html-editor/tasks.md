# Tasks

## 1. Package Dependencies & TipTap Cleanup

- [x] 1.1 Remove `@tiptap/*` packages from `package.json` and clean up unused TipTap extension files in `src/components/editor/extensions/`
- [x] 1.2 Update `src/lib/editor/block-converter.ts` to convert legacy blocks to clean unified HTML and serialize raw HTML directly

## 2. Pure HTML Note Editor Component

- [x] 2.1 Implement `HtmlNoteEditor` in `src/components/editor/html-note-editor.tsx` featuring line numbers gutter, tab indentation handling, quick-insert snippet toolbar, and document statistics
- [x] 2.2 Update `src/app/edit/page.tsx` to replace `RichEditor` with `HtmlNoteEditor` and wire live split and preview modes

## 3. Reader & Live Preview Rendering

- [x] 3.1 Update `src/components/editor/live-preview.tsx` to render full document HTML with real-time KaTeX math compilation
- [x] 3.2 Update `src/components/reader/note-reader.tsx` to render document HTML directly with KaTeX math rendering and print stylesheet isolation

## 4. Verification & Build

- [x] 4.1 Run `npm run build` and verify the Next.js production build succeeds with all TipTap packages removed and all TypeScript checks passing

