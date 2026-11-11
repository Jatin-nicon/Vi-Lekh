# Proposal

## Why

When users print a note via `Ctrl+P` (or `Cmd+P`), browsers currently capture the entire screen layout, including the sticky top navigation bar, course dropdown, global search input, and multi-level syllabus sidebar. In addition, dark mode and screen-based card shadows waste printer ink and result in awkward page cutoffs. Users require an optimized print and PDF export experience that isolates solely the lecture note content into a clean, professional, textbook-like academic printout.

## What Changes

- **Print Media Isolation (`@media print`)**:
  - Automatically hides all non-document UI chrome when printing: the top navigation header, course sidebar, search bar, theme toggle, and user menu.
  - Removes screen-bound scrolling containers (`h-screen`, `overflow-y-auto`) so multi-page technical notes flow naturally across multiple physical or PDF pages without truncation.
  - Suppresses card shadows, border outlines, and oat/dark canvas backgrounds in favor of crisp dark charcoal ink on pure white paper (`#ffffff`).
- **Academic Page Breaks & Formatting Protection**:
  - Implements orphan prevention: headings avoid breaking at the bottom of a page (`break-after: avoid; break-inside: avoid;`).
  - Protects math equations and syntax-highlighted code blocks from breaking awkwardly across page seams (`break-inside: avoid;`).
  - Ensures long code blocks wrap or format cleanly without horizontal overflow clipping.
- **Explicit Print Action in Reader**:
  - Adds a subtle "Print Note" button with a printer icon to the note reader header, allowing users to trigger clean printing with one click in addition to standard `Ctrl+P` / `Cmd+P` shortcuts.
  - The print button itself is hidden when printing (`print:hidden`).
  - Includes a clean academic header at the top of the printed document with the course name, lecture title, and date.

## Capabilities

### Modified Capabilities
- `cozy-theme`: Adds requirements for clean print-media stylesheet isolation, high-contrast print typography, and an explicit document print trigger.

## Impact

- **CSS & Layout**:
  - `src/app/globals.css`: Adds `@media print` rules, `@page` margin declarations, and page-break utilities.
  - `src/app/notes/page.tsx`: Adds `print:hidden` to `<header>` and `<CourseSidebar>`, and enables unconstrained page flow for `<main>`.
- **Components**:
  - `src/components/reader/note-reader.tsx`: Adds the "Print Note" action trigger button and print-ready card formatting.

