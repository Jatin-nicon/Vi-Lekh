# Proposal: Transparent Text Box & Print Alignment

## Why

Users need typed annotation text boxes to have a transparent background rather than an opaque solid fill so that annotations do not occlude the underlying lecture notes, diagrams, or mathematical formulas. Additionally, text box alignment in PDF print export must align with the screen representation without visual drifting.

## What Changes

- Refactor `WordDocsTextBoxItem` to use a transparent background (`bg-transparent`) instead of an opaque white/dark solid card background.
- Maintain subtle outline and interactive selection boundaries (handles, resize borders, drag controls) while keeping the interior transparent.
- Synchronize print styles in `@media print` to enforce `background: transparent !important` with matching bounding box dimensions and typography to prevent print alignment drift.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `note-annotations`: Update `Requirement: Click-to-type annotation text boxes` and `Requirement: Annotated vector PDF print export` to specify transparent background fill and 1:1 screen-to-print coordinate fidelity.

## Impact

- `src/components/reader/annotation-layer.tsx`: Text box styling and selection frame styling.
- `src/app/globals.css`: `@media print` overrides for `.annotation-text-box`.

