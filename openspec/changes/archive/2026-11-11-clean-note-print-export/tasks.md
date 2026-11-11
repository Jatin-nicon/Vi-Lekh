# Tasks

## 1. Global Print Stylesheet

- [x] 1.1 Add `@page` margins, print-color-adjust rules, and pure white background / dark ink variable overrides under `@media print` in `src/app/globals.css`; verify CSS syntax.
- [x] 1.2 Implement page-break rules (`break-inside: avoid`, `break-after: avoid`) for headings, KaTeX math containers, and code blocks in `src/app/globals.css`; verify break rule formatting.

## 2. Reader Shell Print Hiding & Unconstrained Flow

- [x] 2.1 Add `print:hidden` to the top navigation header and course sidebar in `src/app/notes/page.tsx` to isolate the note document; verify print utility classes on navigation chrome.
- [x] 2.2 Neutralize screen viewport constraints on `<main>` in `src/app/notes/page.tsx` during print (`print:overflow-visible print:h-auto print:w-full`); verify DOM structure.

## 3. Reader Print Trigger & Document Header

- [x] 3.1 Implement a "Print Note" button with a `Printer` icon in `src/components/reader/note-reader.tsx` that invokes `window.print()` and hides itself during printing (`print:hidden`); verify component markup.
- [x] 3.2 Ensure the paper card wrapper in `src/components/reader/note-reader.tsx` drops shadows and screen-only borders on print (`print:shadow-none print:border-none print:p-0 print:max-w-none`), while preserving clear course metadata; verify rendered classes.

## 4. Verification & Build

- [x] 4.1 Execute `npm run build` and verify successful compilation, route integrity, and clean print styling across desktop and print emulation.

## Workflow follow-up

- Archive the change after implementation and user verification.
- Sync updated specs with main capability specifications.

