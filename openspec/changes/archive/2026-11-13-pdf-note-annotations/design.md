# Design

## Context

See `proposal.md` for background and motivation. Vi-Lekh previously rendered lecture notes as responsive HTML inside a Shadow DOM, with a single overlay canvas covering the whole document. In addition to text reflow across differing screen and paper widths, browser print engines treat SVGs as atomic replaced elements that cannot be paginated cleanly across printed pages.

Switching to a PDF-first model gives each document rigid, page-by-page physical dimensions (e.g., standard A4 points: 595.28 × 841.89 pt). This provides an immutable coordinate system where every annotation is permanently anchored to an exact page and location.

## Goals / Non-Goals

**Goals:**
- Render multi-page PDF documents cleanly inside the Note Reader using `pdfjs-dist` with high-DPI canvas rendering and a selectable text layer.
- Scope annotations (freehand pen, translucent highlighter, straight underlines, Word/Docs-style transparent text boxes) to individual PDF pages.
- Normalize annotation coordinates to native PDF points (`scale = renderedWidth / intrinsicWidth`), ensuring annotations scale proportionally with page zoom and screen resizing.
- Provide a one-click client-side "Download Annotated PDF" feature powered by `pdf-lib`, embedding vector paths, highlights, and text directly into the PDF binary with zero print dialog reflow.
- Enable PDF uploading in the Creator Studio with storage in Supabase Storage and a client-side local file fallback for offline testing.

**Non-Goals:**
- Real-time collaborative multi-user live cursors on PDFs (annotations remain cached locally in `localStorage` per user session).
- PDF structural editing (reordering, deleting, rotating, or splitting PDF pages).
- Full OCR extraction for scanned, non-searchable image PDFs.

## Decisions

### Decision 1: Use `pdfjs-dist` with Custom Canvas & Text Layer over Native `<iframe/embed>`
- **Choice**: Render pages using Mozilla's `pdfjs-dist` onto individual HTML5 `<canvas>` elements wrapped by a DOM text layer.
- **Alternatives Considered**:
  - Native `<iframe src="file.pdf">`: Embeds the browser's default PDF viewer. However, browser viewers (Chrome PDF Viewer) block React overlay layers from intercepting pointer events, making custom toolbars, highlighters, and text boxes impossible.
- **Rationale**: `pdfjs-dist` provides raw canvas rendering and structured text spans, allowing us to stack our existing `<AnnotationLayer>` directly above each page canvas in standard React DOM.

### Decision 2: Coordinate Normalization to Intrinsic PDF Points (72 DPI Points)
- **Choice**: Record and store all strokes and text box coordinates normalized to the page's intrinsic PDF point dimensions (`ptX = screenX / displayScale`, `ptY = screenY / displayScale`).
- **Rationale**: A standard A4 PDF page is always 595.28 × 841.89 pt regardless of display scale (100%, 150%, or mobile screens). Normalizing coordinates ensures that when a user zooms in or out, or when `pdf-lib` writes to the PDF file, coordinates match 1:1 with zero mathematical drift.

### Decision 3: Client-Side PDF Vector Baking via `pdf-lib`
- **Choice**: Use `pdf-lib` in the browser to load the PDF bytes, draw vector strokes (`page.drawLine`, `page.drawSvgPath`), translucent highlights, and text boxes (`page.drawText`), and download the resulting binary via browser blob URL.
- **Alternatives Considered**:
  - Browser `window.print()` / `@media print`: Highly erratic, reflows content, fails to slice tall SVGs across pages, and forces users through complex printer settings.
  - Server-side headless Chrome / Puppeteer: High infrastructure cost, slow execution latency, and requires server compute for every download.
- **Rationale**: `pdf-lib` runs 100% on the client, executes in milliseconds, preserves vector crispness, and generates a standard PDF file that opens identically in Adobe Acrobat, Apple Preview, and Google Drive.

### Decision 4: Upload Flow & Test Fallback
- **Choice**: Creator Studio allows selecting or dropping a `.pdf` file. The file is uploaded to Supabase Storage bucket `course-pdfs` and saved as `pdf_url` on the note revision. Additionally, provide a client-side "Choose Local PDF to Annotate" dropzone for instant local testing without cloud credentials.
- **Rationale**: Allows immediate verification on any developer or test machine while providing the production path for Supabase.

## Architecture

```text
+-------------------------------------------------------------------------+
|                        PDF NOTE READER ARCHITECTURE                     |
+-------------------------------------------------------------------------+

  [ Sticky Annotation Toolbar (Pen, Highlighter, Text, Undo, Download) ]
                                    |
  +---------------------------------------------------------------------+
  | PDF Continuous Page Scroll Container                                |
  |                                                                     |
  |  +---------------------------------------------------------------+  |
  |  | PDF Page 1 Wrapper (relative, width: W, height: H)            |  |
  |  |   - <canvas> (Rendered via PDF.js)                            |  |
  |  |   - <div class="textLayer"> (Selectable native text)          |  |
  |  |   - <AnnotationLayer page={1} scale={s}> (SVG Overlay)        |  |
  |  +---------------------------------------------------------------+  |
  |                                                                     |
  |  +---------------------------------------------------------------+  |
  |  | PDF Page 2 Wrapper (relative, width: W, height: H)            |  |
  |  |   - <canvas> (Rendered via PDF.js)                            |  |
  |  |   - <div class="textLayer">                                   |  |
  |  |   - <AnnotationLayer page={2} scale={s}> (SVG Overlay)        |  |
  |  +---------------------------------------------------------------+  |
  +---------------------------------------------------------------------+
                                    |
            [ Download Annotated PDF Button ]
                                    |
                                    v
     +---------------------------------------------------------------+
     | client-side `pdf-lib` baking pipeline:                        |
     |   1. const pdfDoc = await PDFDocument.load(existingPdfBytes)  |
     |   2. For each page: draw paths, highlights, and text boxes    |
     |   3. const pdfBytes = await pdfDoc.save()                     |
     |   4. downloadBlob(pdfBytes, `${noteTitle}_annotated.pdf`)     |
     +---------------------------------------------------------------+
```

## Risks / Trade-offs

- **[Risk] Worker script configuration in Next.js Turbopack for `pdfjs-dist`**  
  → **Mitigation**: Configure `pdfjs-dist` to use its bundled worker or standard unpkg/cdnjs worker CDN, preventing webpack/turbopack bundling collisions.
- **[Risk] High-DPI blurriness on Retina/4K screens**  
  → **Mitigation**: Scale the HTML5 canvas by `window.devicePixelRatio` (typically 2x) while keeping CSS dimensions at 1x to ensure razor-sharp rendering of math, text, and vector diagrams.
- **[Risk] Multi-page note memory consumption**  
  → **Mitigation**: Render pages sequentially in standard flow; for typical 10-40 page slide decks, modern browser DOM handles canvas elements comfortably.

