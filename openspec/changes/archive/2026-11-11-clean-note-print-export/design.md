# Design

## Context

Vi-Lekh's lecture notes reader (`/notes?course=...`) renders within a multi-pane layout: a sticky top navigation header, a course syllabus sidebar (`CourseSidebar`), and the centered note paper sheet (`NoteReader`).

When a user initiates printing via `Ctrl+P` (or `Cmd+P`), the browser defaults to printing the full screen viewport, including navigation controls and sidebars, while preserving on-screen dark mode or oat canvas background fills. See `proposal.md - Why` for motivation.

## Goals / Non-Goals

**Goals:**
- Provide a clean print stylesheet via `@media print` and Tailwind CSS `print:` utility classes that isolates solely the lecture note document.
- Hide non-document UI components: navigation header, course sidebar, theme toggles, user profile menus, and interactive buttons.
- Neutralize screen-bound layout constraints (`overflow-y-auto`, `h-screen`, `max-w-3xl`, box shadows) on print to allow natural multi-page pagination.
- Force pure white background (`#ffffff`) and crisp dark charcoal text (`#111111`) across both light and dark modes during print.
- Provide a visible, accessible "Print Note" button in the note reader header that triggers `window.print()`.
- Protect typography against orphan page splits (headings, KaTeX math blocks, and code containers).

**Non-Goals:**
- Server-side headless PDF generation with heavy dependencies (Puppeteer/Chromium); client-side native browser print and "Save as PDF" provides instant, zero-latency export.
- Custom print styles for management pages like `/studio` or `/edit`.

## Decisions

### Decision 1: Global Print Media Rules in `globals.css`

**Approach:** Define comprehensive `@media print` rules in `src/app/globals.css`.
- Configure standard academic page margins:
  ```css
  @page {
    margin: 15mm 20mm;
    size: auto;
  }
  ```
- Override theme variables on print to force pure white paper and high-contrast ink:
  ```css
  @media print {
    body, :root, .dark {
      background: #ffffff !important;
      color: #111111 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  ```
- Remove shadow elevations, rounded pill borders, and outer canvas padding:
  ```css
  @media print {
    .print-sheet {
      box-shadow: none !important;
      border: none !important;
      background: #ffffff !important;
      padding: 0 !important;
      max-width: 100% !important;
    }
  }
  ```

*Alternatives Considered:* Injecting dynamic inline print stylesheets via JavaScript. Rejected because CSS `@media print` is standard, declarative, and supported natively by all browsers on `Ctrl+P`.

### Decision 2: Layout Unconstraining on Print

**Approach:**
- In `src/app/notes/page.tsx`:
  - Add `print:hidden` to the `<header>` element.
  - Wrap `<CourseSidebar>` in a container with `print:hidden`.
  - On the `<main>` note body container, add:
    `print:overflow-visible print:h-auto print:p-0 print:m-0 print:w-full print:block`
  This eliminates browser viewport clipping where scrollable containers get cut off after the first page.

### Decision 3: Explicit "Print Note" Trigger in Reader

**Approach:**
- In `src/components/reader/note-reader.tsx`, add an understated "Print Note" button in the document meta banner next to the verified badge.
- The button calls `window.print()` when clicked.
- It is annotated with `print:hidden` so it disappears from the printed output.
- The button displays a subtle `Printer` icon and label matching Vi-Lekh's understated ghost action design.

### Decision 4: Page Break & Content Overflow Safeguards

**Approach:**
- **Headings (`h1`, `h2`, `h3`)**: Add `break-after: avoid; break-inside: avoid;` so headings are never printed alone at the bottom of a page without subsequent prose.
- **Math Display Blocks (`.katex-display`)**: Add `break-inside: avoid;` to prevent complex equations from breaking mid-formula across two sheets.
- **Code Snippets (`pre`, code blocks)**: Add `break-inside: avoid; white-space: pre-wrap; word-break: break-word;` so short code snippets stay intact, and long lines wrap rather than truncating off the right edge of physical paper.
- **Card borders**: Code and math containers retain a fine light border (`#E0E0E0`) so they remain visually structured even if the user prints with "Background graphics" disabled in browser print settings.

## Risks / Trade-offs

- **[Risk: Browser 'Background Graphics' checkbox disabled]** → Mitigation: Use high-contrast text and explicit hairline border rules (`border: 1px solid #dcdcdc`) for code and callout boxes instead of relying purely on subtle background fills.
- **[Risk: Dark mode ink inversion]** → Mitigation: Explicitly override `.dark` root styles under `@media print` to guarantee black ink on white background.

