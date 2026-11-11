# Proposal

## Why

Academic curriculum handouts and guided workbooks (such as the Samagra / Vicharanashala IIT Ropar notes) require rich, structured pedagogical elements that go beyond generic linear prose. Authors currently lack native tools in Vi-Lekh to construct horizontal step flow sequences, student reflection write-in boxes, concept and antipattern comparison card grids, multi-round prompt evolution dialogues, and warm pinned mantras. Without these blocks, authors must resort to static exported images or fragmented bullet lists, depriving learners of structured interactive worksheets and crisp printable study materials.

## What Changes

- **Process Flow / Step Sequencer Block (`/flow`)**:
  - Introduces a native multi-step horizontal flow block where authors can add/remove sequential steps, select icons/emojis, specify titles/descriptions, and toggle active/highlighted stages.
  - Renders as an aligned responsive track with connection arrows (`→`) in the reader, wrapping gracefully on mobile viewports.
- **Student Reflection & Worksheet Note Box (`/your-note`)**:
  - Adds a lined workbook reflection block with a customizable prompt and ruled writing lines.
  - Interactive on screen (students can click into ruled lines to type notes, stored in `localStorage`) and renders physical notebook rule lines on print export.
- **Concept & Antipattern Card Grids (`/cards`)**:
  - Adds a 2-column responsive card container with customizable accent themes: Neutral/Term, Danger/Pitfall (red border), Success/Fix (green border), and Exercise (dashed border).
  - Supports an integrated *"In other words: ..."* plain-language summary line.
- **Multi-Round Prompt Dialogue Block (`/round`)**:
  - Adds a paired evolution card showing prompt growth across rounds (Round 1, 2, 3), separating "YOU ASK" from "YOU GET, AND NOTICE".
- **Pinned Key Takeaways & Worksheet Header (`/pinned`)**:
  - Adds an amber pinned note card with a pushpin icon (`📌`) for core principles.
  - Adds an optional "Worksheet Mode" note header displaying course metadata, title, and student `Name: ____________ Date: ____________` blanks for academic handout distribution.
- **Block Converter & Serialization**:
  - Updates `src/lib/editor/block-converter.ts` to serialize and deserialize all new pedagogical blocks between TipTap HTML and `NoteBlock[]`.

## Capabilities

### Modified Capabilities
- `note-editor`: Adds requirements for workbook pedagogical blocks, slash command registration (`/flow`, `/your-note`, `/cards`, `/round`, `/pinned`), and block serialization.
- `cozy-theme`: Adds requirements for workbook handout aesthetics, ruled notebook line styling, card accent borders, and clean print worksheet rendering.

## Impact

- **Editor Extensions**:
  - `src/components/editor/extensions/`: Implements TipTap extensions and React node views for `flow`, `your-note`, `cards`, `round`, and `pinned-note`.
  - `src/components/editor/extensions/slash-items.ts`: Registers new slash commands with icons, categories, and aliases.
  - `src/components/editor/rich-editor.tsx`: Registers the new extensions.
- **Serialization & Data Model**:
  - `src/lib/editor/block-converter.ts`: Parses and converts the new blocks between TipTap HTML and structured blocks.
  - `src/lib/supabase/types.ts`: Extends `NoteBlock["type"]` with the new pedagogical block types.
- **Reader & Layout**:
  - `src/components/reader/note-reader.tsx`: Renders rich interactive and print-ready components for each block type.
  - `src/app/globals.css`: Adds CSS for ruled notebook lines, flow connector arrows, and print worksheet layout.

