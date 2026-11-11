# Design: Transparent Text Box & Print Alignment

## Context

See `proposal.md` for user motivation and problem statement.
Currently, `WordDocsTextBoxItem` in `src/components/reader/annotation-layer.tsx` applies an opaque background (`bg-white dark:bg-[#1E1C1B]`) and `globals.css` applies a solid white print override. This blocks out note content beneath the text box. The user desires a 100% transparent text box background so underlying content remains visible.

## Goals / Non-Goals

**Goals:**
- Render text boxes with transparent background (`bg-transparent`) in both unselected and selected active states.
- Retain bounding frame, corner resize handles, and move controls when selected for intuitive editing without obscuring underlying text.
- Synchronize print styles so text boxes render with transparent background and exact screen coordinates during `@media print` PDF export.

**Non-Goals:**
- Custom background opacity sliders or color pickers for background fill.

## Decisions

### 1. Transparent Interior Fill with Retained Frame Handles
- **Choice**: Remove `bg-white dark:bg-[#1E1C1B]` and use `bg-transparent`.
- **Rationale**:
  - By using `bg-transparent`, annotations behave like direct annotations written on the page rather than solid opaque stickers.
  - When selected, the blue/accent outline and corner handles show the bounding box for moving and resizing, but the interior remains transparent so the user can see what they are annotating over.
  - When deselected, the border is subtle or transparent, blending the typed text into the document.

### 2. Print Style Overrides
- **Choice**: Enforce `background: transparent !important` and `background-color: transparent !important` on `.annotation-text-box` and its inner container in `@media print`.
- **Rationale**: Ensures the exported PDF preserves transparency without white boxes obscuring lecture note paragraphs, formulas, or diagrams.

## Risks / Trade-offs

- **[Risk]** Text legibility if typed directly over high-contrast underlying text.
  - **Mitigation**: Users select distinct ink colors (Terracotta, Ink, Amber Gold, Emerald, Azure) and can move the text box using the drag handle to margins or clear regions.

