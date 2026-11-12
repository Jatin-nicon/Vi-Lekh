# Tasks

## 1. Dependencies & Core PDF Utilities

- [x] 1.1 Install `pdfjs-dist` and `pdf-lib` and verify dependencies install cleanly with `npm install`
- [x] 1.2 Configure `pdfjs-dist` worker loader for Next.js Turbopack and verify worker initializes without runtime errors

## 2. Multi-Page PDF Viewer & Text Layer

- [x] 2.1 Implement `PdfPageView` component with high-DPI HTML5 canvas rendering and selectable DOM text layer
- [x] 2.2 Build continuous multi-page PDF scroll viewer in `NoteReader` supporting page indicators and zoom scaling

## 3. Per-Page Coordinate-Locked Annotation Layer

- [x] 3.1 Update `AnnotationLayer` to accept page-specific dimensions and normalize stroke/textbox coordinates to native PDF points
- [x] 3.2 Partition stroke and text box persistence in `localStorage` keyed by note ID and page index
- [x] 3.3 Verify freehand pen, translucent highlighter, straight underline, eraser, and transparent text boxes work reliably on any rendered PDF page

## 4. Client-Side Vector PDF Baking & Instant Download

- [x] 4.1 Implement `exportAnnotatedPdf` using `pdf-lib` to bake SVG strokes, highlighters, underlines, and transparent text boxes directly into the PDF binary
- [x] 4.2 Connect toolbar export button to `exportAnnotatedPdf` to trigger immediate client-side file download without browser print dialogs

## 5. Upload Integration & End-to-End Verification

- [x] 5.1 Add PDF file upload dropzone in Creator Studio with a local file test selector in Note Reader for offline verification
- [x] 5.2 Run production build (`npm run build`) and perform end-to-end test verifying that annotations downloaded in the PDF align 1:1 with the on-screen view

