# Tasks

## 1. Isolated Shadow DOM Viewer Component

- [x] 1.1 Create `src/components/editor/html-sandboxed-viewer.tsx` implementing React Shadow DOM encapsulation with KaTeX stylesheet link and theme class synchronization, and verify it attaches an open shadow root without global style leakage
- [x] 1.2 Include foundational educational CSS helpers (`.callout`, `.pinned-note`, `.card-grid`, `.process-flow`, `.your-note`, and tables) inside the shadow root styles and verify default typography renders cleanly

## 2. Reader & Live Preview Integration

- [x] 2.1 Refactor `src/components/reader/note-reader.tsx` to render notes via `HtmlSandboxedViewer`, removing the artificial `.print-sheet` padding (`p-8 sm:p-12`), duplicate sheet borders, and hardcoded worksheet blanks
- [x] 2.2 Update `src/components/editor/live-preview.tsx` to use `HtmlSandboxedViewer` for real-time preview isolation, verifying that embedded `<style>` tags with universal resets do not mutate editor navigation or outer buttons

## 3. Print Layout & Build Verification

- [x] 3.1 Update `@media print` rules in `src/app/globals.css` and container layout in `src/app/notes/page.tsx` ensuring the isolated note prints cleanly without double page borders or clipped margins
- [x] 3.2 Run `npm run build` and verify the Next.js production build succeeds with all TypeScript checks passing

