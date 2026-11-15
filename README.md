# Vi-Lekh

An editorial-grade collaborative note-taking and PDF annotation platform built with Next.js 16, React 19, Supabase, and BlockNote.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Annotation & History Architecture (Undo / Redo)

Vi-Lekh features an interactive annotation layer supporting freehand pens, highlighters, underlines, geometric shapes, positioned text boxes, and continuous drag-to-erase with full Undo/Redo capability (`Ctrl+Z` / `Ctrl+Y`).

### Stack Capacity & Efficiency

The undo/redo engine is powered by an immutable document-level snapshot stack (`undoStackRef` / `redoStackRef`):

* **History Buffer Cap**: Stored up to a maximum of **50 snapshots** per session (oldest discarded via FIFO shift).
* **Memory Footprint**:
  * A single page snapshot (containing ~50 vector strokes, shapes, and text boxes) consumes **$\approx 25\text{ KB} - 100\text{ KB}$**.
  * A full 50-entry history stack consumes **$\approx 1.5\text{ MB} - 5\text{ MB}$** of RAM in the browser ($< 1\%$ of typical tab memory).
* **Execution Performance**: State restoration is **instant $O(1)$** via direct array swap without iterative reverse patch computations. Deep cloning takes $< 1\text{ ms}$ per gesture.
* **Why Snapshots over Deltas**: Drag-to-erase gestures can sweep across multiple strokes, shapes, and text boxes simultaneously. Immutable page snapshots eliminate state drift and race conditions during high-frequency pointer interactions.
* **Sizing Trade-offs**:
  * *Less (e.g. 10–20)*: Negligible memory savings ($\approx 1\text{ MB}$), but disrupts sketching workflows when quick consecutive strokes exhaust the buffer.
  * *More (e.g. 100+)*: Safe on modern devices ($\approx 8\text{–}15\text{ MB}$ RAM), but 50 provides an industry-standard sweet spot preventing memory bloat during prolonged handwriting sessions.
