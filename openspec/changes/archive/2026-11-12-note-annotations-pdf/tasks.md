# Tasks

## 1. Sticky Annotation Toolbar Component

- [x] 1.1 Create `src/components/reader/annotation-toolbar.tsx` featuring sticky positioning (`sticky top-2 z-40`), tool selectors (Cursor, Pen, Highlighter, Underline, Eraser), color swatches, Undo, Clear, and Export PDF action, and verify it renders without scrolling away
- [x] 1.2 Implement stroke styling and color state management in `src/components/reader/annotation-toolbar.tsx` supporting Terracotta, Ink Black, Amber Gold, Emerald, and Azure

## 2. Interactive SVG Vector Overlay Layer

- [x] 2.1 Implement `src/components/reader/annotation-layer.tsx` with SVG vector path rendering, mouse/touch/stylus stroke capture, translucent multiply blend mode for highlighters, straight underlines, and stroke erasure
- [x] 2.2 Add browser `localStorage` serialization and automatic restoration in `annotation-layer.tsx` keyed by note ID, verifying annotations persist across page reloads

## 3. Reader Integration, Print Export & Verification

- [x] 3.1 Integrate `AnnotationToolbar` and `AnnotationLayer` into `src/components/reader/note-reader.tsx`, synchronizing the SVG overlay dimensions with the note content container using `ResizeObserver`
- [x] 3.2 Update `@media print` rules in `src/app/globals.css` ensuring vector annotation strokes print crisply over note text while the floating dock and navigation chrome remain hidden
- [x] 3.3 Run `npm run build` and verify the Next.js production build succeeds with all TypeScript checks passing

## 4. Text Box Annotations

- [x] 4.1 Update `src/components/reader/annotation-toolbar.tsx` to include the Text tool toggle and icon
- [x] 4.2 Update `src/components/reader/annotation-layer.tsx` to support placing, editing, persisting, and erasing text box annotations
- [x] 4.3 Run `npm run build` and verify Next.js production build with text box annotations and print styles passing

## 5. Text Box Reliability and Focus Lifecycle Fixes

- [x] 5.1 Fix text box creation and focus retention in `src/components/reader/annotation-layer.tsx` by eliminating premature blur-deletion and preventing pointer focus loss
- [x] 5.2 Ensure empty active text boxes remain visible with placeholder until explicitly deleted or tool changed
- [x] 5.3 Run `npm run build` and verify text box insertion, typing, repositioning, and print styles pass cleanly

## 6. Word/Docs-Style Document Text Box & Sticky Toolbar Refactor

- [x] 6.1 Fix sticky toolbar scroll pinning by clearing `overflow-y-auto` on `<main>` in `src/app/notes/page.tsx` and setting `sticky top-20` in `src/components/reader/annotation-toolbar.tsx`
- [x] 6.2 Refactor `AnnotationTextBox` model with `width` and selection state in `src/components/reader/annotation-layer.tsx`
- [x] 6.3 Implement Word/Docs-style selection frame with corner resize handles, border drag-to-move, solid background fill, and direct inline textarea
- [x] 6.4 Add click-outside deselection, keyboard deletion (`Delete` / `Backspace`), and PDF print styles
- [x] 6.5 Run `npm run build` and verify production build
