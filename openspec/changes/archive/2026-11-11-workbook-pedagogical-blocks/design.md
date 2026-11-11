# Design

## Context

Vi-Lekh's authoring stack is built on TipTap (`@tiptap/react`, StarterKit, Highlight, Link, Image) paired with custom Node extensions (such as `Callout` and `NotionCodeBlockExtension`), an extensible slash command suggestion menu (`slash-items.ts`, `slash-command.ts`), and a DOM-based serializer/deserializer (`block-converter.ts`) that persists documents into Supabase as typed `NoteBlock[]`. The reader (`note-reader.tsx`) interprets these blocks and renders them within a cozy Linen Parchment sheet, with `@media print` rules for physical printing.

Currently, authors have no native way to construct multi-step flows, student write-in reflection boxes, 2-column comparison card grids, multi-turn prompt growth rounds, or pinned takeaways without uploading external static raster graphics. See `proposal.md - Why`.

## Goals / Non-Goals

**Goals:**
- Implement 5 native pedagogical workbook blocks in TipTap using `ReactNodeViewRenderer`:
  1. **Process Flow Sequencer (`/flow`)**: Interactive step track with connection arrows and active/highlight toggling.
  2. **Student Reflection Box (`/your-note`)**: Lined workbook note box with configurable writing lines and local note-taking support.
  3. **Concept & Antipattern Card Grid (`/cards`)**: 2-column grid with semantic borders (pitfall red, fix green, term neutral, exercise dashed).
  4. **Multi-Round Prompt Dialogue (`/round`)**: Paired question/observation blocks with round number badge.
  5. **Pinned Key Takeaway (`/pinned`)**: Warm amber sticky note card with a pushpin icon.
- Provide an optional "Worksheet Mode" layout displaying student `Name` and `Date` blanks for academic handouts.
- Support interactive typing in the reader for reflection notes with `localStorage` persistence, while rendering crisp ruled handwriting lines on physical print.
- Ensure 100% responsive behavior on mobile (arrows pointing down when wrapped) and ink-efficient rendering on print.

**Non-Goals:**
- Requiring database migration or new tables; all blocks serialize into standard JSON `NoteBlock` structures in the existing revisions table.
- Heavy canvas-based visual diagramming tools (e.g. Excalidraw, tldraw); declarative structured HTML/CSS components provide immediate accessibility, responsive wrapping, and perfect print fidelity.

## Decisions

### Decision 1: React Node Views for In-Editor Authoring

**Approach:** Build TipTap extensions (`ProcessFlow`, `YourNote`, `CardGrid`, `PromptRound`, `PinnedNote`) using `ReactNodeViewRenderer`.
- In the editor, each node renders an interactive React control where authors can:
  - Add or remove steps in a flow with `[+ Add Step]` and select step emojis.
  - Type prompt instructions in reflection boxes and choose number of rule lines.
  - Set card accent colors (Neutral, Pitfall, Solution) via dropdown.
  - Configure round numbers and observations.
*Alternatives Considered:* Raw Markdown shortcodes (e.g., `:::flow`). Rejected because shortcodes offer no visual feedback in WYSIWYG mode and are prone to syntax mistakes.

### Decision 2: Semantic HTML Data Attributes for Serialization

**Approach:** Use clean HTML markup with data attributes for persistence:
- `<div data-type="process-flow" data-steps="...">`
- `<div data-type="workbook-note" data-prompt="..." data-lines="...">`
- `<div data-type="card-grid" data-columns="2">`
- `<div data-type="prompt-round" data-round="1">`
- `<div data-type="pinned-note">`
`block-converter.ts` maps these seamlessly to and from `NoteBlock` records.
*Alternatives Considered:* Storing raw JSON directly in TipTap's HTML output. Rejected because semantic HTML ensures backwards-compatible fallback rendering even if a custom extension fails to mount.

### Decision 3: Client-Side Reflection Persistence

**Approach:** In `NoteReader`, when students type notes into `✎ YOUR NOTE`, input is preserved in browser `localStorage` keyed by `vilekh_note_reflection_${noteId}_${blockId}`.
- Allows students to complete worksheets online without requiring authentication or modifying the authoritative published note in the database.
- On print (`window.print()`), if the user typed text, their answer prints neatly inside the lines; if empty, clean blank ruled lines print for pen-and-paper handwriting.

### Decision 4: Responsive Flow Arrows & Ruled Line CSS

**Approach:**
- **Flow Connector Arrows**: On desktop (`md:`), steps display horizontal right arrows `→`. On narrow screens, steps stack vertically with downward arrows `↓`.
- **Ruled Lines**: Screen displays subtle chamomile/wheat guidelines using repeating background gradients (`repeating-linear-gradient`). On `@media print`, solid `#C0C0C0` lines render with `print-color-adjust: exact`.

## Risks / Trade-offs

- **[Risk: Mobile display of multi-step flows]** → Mitigation: Use flex-col on mobile and flex-row on desktop, swapping arrow direction dynamically so 4-step flows never cause horizontal scrolling on mobile devices.
- **[Risk: Accidental editing during reading]** → Mitigation: In the reader, only the reflection input textarea is interactive; all other pedagogical components (flows, cards, rounds) are strictly read-only.

