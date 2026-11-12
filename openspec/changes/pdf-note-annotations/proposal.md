# Proposal

## Why

Currently, lecture notes in Vi-Lekh are rendered as responsive HTML. Overlaying interactive annotations (freehand pen strokes, highlighters, underlines, and transparent text boxes) on fluid HTML documents causes layout and coordinate drift during browser print/PDF export, because browser print engines reflow text across viewports and cannot natively slice continuous SVG overlays across printed page breaks.

Switching to a PDF-first note workflow solves this at the architectural level: PDFs have immutable, pre-paginated physical coordinates (points) that never reflow. Instructors and contributors can upload existing PDF lecture slides, problem sets, and handouts directly. Students and readers can annotate over fixed PDF pages with 100% vector accuracy, and download the resulting annotated document with vector paths and text baked directly into the PDF via client-side `pdf-lib`—bypassing flaky browser print dialogs entirely.

## What Changes

- **PDF Note Upload**: Replace/augment HTML authoring in the Creator Studio with PDF document uploads (drag-and-drop or file picker) stored in cloud/local object storage.
- **Multi-Page PDF Viewer**: Render uploaded PDFs in the Note Reader using `pdfjs-dist`, featuring high-DPI canvas rendering, standard page navigation, zoom controls, and a selectable text layer.
- **Per-Page Annotation Surface**: Bind `AnnotationLayer` directly to individual PDF pages rather than a continuous fluid HTML container. Stroke points and text box coordinates are normalized to the PDF page's intrinsic point coordinate space (e.g. 595 × 842 pt).
- **Client-Side Annotated PDF Baking & Download**: Replace the browser's `window.print()` print dialog with client-side PDF generation using `pdf-lib`. The original PDF binary is loaded, annotations and transparent text boxes are baked into the respective page vector streams, and the finished PDF is saved directly to the user's device with zero layout shift.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `note-annotations`: Update annotation coordinate space to bind to per-page PDF coordinates instead of an HTML container, and replace `window.print()` export with client-side `pdf-lib` binary vector baking and direct file download.
- `note-editor`: Add PDF file upload and storage workflow in place of raw HTML editing, updating the note reader to render PDF documents instead of the sandboxed HTML viewer.

## Impact

- **New Dependencies**: `pdfjs-dist` (or `react-pdf`) for in-browser PDF rendering, `pdf-lib` for client-side vector annotation baking and download.
- **Components Modified**:
  - `src/components/reader/note-reader.tsx`: Render multi-page PDF document with per-page annotation surfaces.
  - `src/components/reader/annotation-layer.tsx`: Support page-scoped coordinate systems and page-indexed annotation caching.
  - `src/components/reader/annotation-toolbar.tsx`: Update export button from "Save PDF (Print)" to "Download Annotated PDF", and add zoom/page controls.
  - `src/app/edit/page.tsx` and studio components: Support PDF file selection, upload, and metadata linking.
- **Data / Storage**: Add `pdf_url` support to note revisions and integrate cloud storage (Supabase Storage bucket `course-pdfs` with local file fallback for offline/test environments).

