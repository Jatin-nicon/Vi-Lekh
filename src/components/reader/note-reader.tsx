"use client";

import React, { useMemo, useState, useCallback, useRef } from "react";
import type { Note, Revision, Profile } from "@/lib/supabase/types";
import { blocksToHtml } from "@/lib/editor/block-converter";
import { renderMathInHtml } from "@/lib/editor/math-html";
import { HtmlSandboxedViewer } from "@/components/editor/html-sandboxed-viewer";
import {
  AnnotationToolbar,
  type AnnotationTool,
} from "./annotation-toolbar";
import {
  AnnotationLayer,
  type AnnotationStroke,
  type AnnotationTextBox,
  type AnnotationShape,
} from "./annotation-layer";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { exportAnnotatedPdf } from "@/lib/pdf/pdf-export";
import { CheckCircle2, Calendar, FileText, Sparkles, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface NoteReaderProps {
  note: Note;
  revision?: Revision | null;
  courseTitle?: string;
  onProposeEdit?: () => void;
  contributors?: Profile[];
  defaultPdfSource?: string | File | ArrayBuffer;
}

export function NoteReader({
  note,
  revision,
  courseTitle = "Course Notes",
  defaultPdfSource,
}: NoteReaderProps) {
  const blocks = revision?.blocks || [];

  // Annotation states
  const [tool, setTool] = useState<AnnotationTool>("pen");
  const [color, setColor] = useState<string>("#A85D44");

  // Per-page annotation maps: pageNumber -> strokes/shapes/textBoxes
  const [pageStrokes, setPageStrokes] = useState<Record<number, AnnotationStroke[]>>({});
  const [pageShapes, setPageShapes] = useState<Record<number, AnnotationShape[]>>({});
  const [pageTextBoxes, setPageTextBoxes] = useState<Record<number, AnnotationTextBox[]>>({});

  // Active page tracked during scroll
  const [activePage, setActivePage] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Detect whether database contains an ephemeral blob: URL from an expired browser session
  const isStaleBlobUrl = useMemo(() => {
    const candidate = revision?.pdf_url || note.pdf_url;
    return Boolean(candidate && candidate.startsWith("blob:"));
  }, [revision?.pdf_url, note.pdf_url]);

  // Determine effective PDF source: revision URL > note URL > fallback default
  const effectivePdfSource = useMemo(() => {
    const candidateUrl = revision?.pdf_url || note.pdf_url;
    if (candidateUrl && !candidateUrl.startsWith("blob:")) {
      return candidateUrl;
    }

    if (defaultPdfSource) return defaultPdfSource;

    // No PDF uploaded for this note
    return null;
  }, [revision?.pdf_url, note.pdf_url, defaultPdfSource]);

  // Fallback HTML content for non-PDF notes
  const renderedContent = useMemo(() => {
    if (!blocks || blocks.length === 0) return "";
    const rawHtml = blocksToHtml(blocks);
    return renderMathInHtml(rawHtml);
  }, [blocks]);

  // Compute total strokes, shapes, and text boxes across all pages
  const totalAnnotationCount = useMemo(() => {
    const strokeCount = Object.values(pageStrokes).reduce((acc, list) => acc + (list?.length || 0), 0);
    const shapeCount = Object.values(pageShapes).reduce((acc, list) => acc + (list?.length || 0), 0);
    const boxCount = Object.values(pageTextBoxes).reduce((acc, list) => acc + (list?.length || 0), 0);
    return strokeCount + shapeCount + boxCount;
  }, [pageStrokes, pageShapes, pageTextBoxes]);

  // Undo last stroke, shape, or text box on the active page
  const handleUndo = useCallback(() => {
    const currentPageStrokes = pageStrokes[activePage] || [];
    const currentPageShapes = pageShapes[activePage] || [];
    const currentPageTextBoxes = pageTextBoxes[activePage] || [];

    if (currentPageStrokes.length > 0) {
      const updated = currentPageStrokes.slice(0, -1);
      setPageStrokes((prev) => ({ ...prev, [activePage]: updated }));
      try {
        localStorage.setItem(
          `vilekh_pdf_annotations_${note.id}_page_${activePage}`,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore
      }
    } else if (currentPageShapes.length > 0) {
      const updated = currentPageShapes.slice(0, -1);
      setPageShapes((prev) => ({ ...prev, [activePage]: updated }));
      try {
        localStorage.setItem(
          `vilekh_pdf_shapes_${note.id}_page_${activePage}`,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore
      }
    } else if (currentPageTextBoxes.length > 0) {
      const updated = currentPageTextBoxes.slice(0, -1);
      setPageTextBoxes((prev) => ({ ...prev, [activePage]: updated }));
      try {
        localStorage.setItem(
          `vilekh_pdf_textboxes_${note.id}_page_${activePage}`,
          JSON.stringify(updated)
        );
      } catch {
        // Ignore
      }
    }
  }, [activePage, note.id, pageStrokes, pageShapes, pageTextBoxes]);

  // Clear annotations on current page or all pages
  const handleClear = useCallback(() => {
    if (totalAnnotationCount === 0) return;

    const clearAll = window.confirm(
      "Clear all annotations across all pages? (Click Cancel to clear only Page " + activePage + ")"
    );

    if (clearAll) {
      setPageStrokes({});
      setPageShapes({});
      setPageTextBoxes({});
      try {
        for (let i = 1; i <= 100; i++) {
          localStorage.removeItem(`vilekh_pdf_annotations_${note.id}_page_${i}`);
          localStorage.removeItem(`vilekh_pdf_shapes_${note.id}_page_${i}`);
          localStorage.removeItem(`vilekh_pdf_textboxes_${note.id}_page_${i}`);
        }
      } catch {
        // Ignore
      }
    } else {
      setPageStrokes((prev) => ({ ...prev, [activePage]: [] }));
      setPageShapes((prev) => ({ ...prev, [activePage]: [] }));
      setPageTextBoxes((prev) => ({ ...prev, [activePage]: [] }));
      try {
        localStorage.removeItem(`vilekh_pdf_annotations_${note.id}_page_${activePage}`);
        localStorage.removeItem(`vilekh_pdf_shapes_${note.id}_page_${activePage}`);
        localStorage.removeItem(`vilekh_pdf_textboxes_${note.id}_page_${activePage}`);
      } catch {
        // Ignore
      }
    }
  }, [totalAnnotationCount, activePage, note.id]);

  // One-click Client-Side PDF vector export via pdf-lib
  const handleExportPdf = useCallback(async () => {
    if (!effectivePdfSource) {
      window.print();
      return;
    }

    try {
      setIsExporting(true);
      await exportAnnotatedPdf({
        pdfSource: effectivePdfSource,
        strokesMap: pageStrokes,
        shapesMap: pageShapes,
        textBoxesMap: pageTextBoxes,
        noteId: note.id,
        filename: `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_annotated`,
      });
    } catch (err) {
      console.error("Failed to export annotated PDF:", err);
      alert("Failed to export PDF. Falling back to browser print dialog.");
      window.print();
    } finally {
      setIsExporting(false);
    }
  }, [effectivePdfSource, pageStrokes, pageShapes, pageTextBoxes, note.id, note.title]);

  // Stable handlers for per-page annotation updates
  const handlePageStrokesChange = useCallback((pageNum: number, newStrokes: AnnotationStroke[]) => {
    setPageStrokes((prev) => {
      if (prev[pageNum] === newStrokes) return prev;
      return { ...prev, [pageNum]: newStrokes };
    });
  }, []);

  const handlePageShapesChange = useCallback((pageNum: number, newShapes: AnnotationShape[]) => {
    setPageShapes((prev) => {
      if (prev[pageNum] === newShapes) return prev;
      return { ...prev, [pageNum]: newShapes };
    });
  }, []);

  const handlePageTextBoxesChange = useCallback((pageNum: number, newBoxes: AnnotationTextBox[]) => {
    setPageTextBoxes((prev) => {
      if (prev[pageNum] === newBoxes) return prev;
      return { ...prev, [pageNum]: newBoxes };
    });
  }, []);

  const renderAnnotationLayer = useCallback(
    (pageNum: number, dims: { scale: number; width: number; height: number; intrinsicWidth: number; intrinsicHeight: number }) => (
      <AnnotationLayer
        noteId={note.id}
        pageNumber={pageNum}
        scale={dims.scale}
        intrinsicWidth={dims.intrinsicWidth}
        intrinsicHeight={dims.intrinsicHeight}
        renderedWidth={dims.width}
        renderedHeight={dims.height}
        tool={tool}
        color={color}
        strokes={pageStrokes[pageNum] || []}
        onChangeStrokes={(newStrokes) => handlePageStrokesChange(pageNum, newStrokes)}
        shapes={pageShapes[pageNum] || []}
        onChangeShapes={(newShapes) => handlePageShapesChange(pageNum, newShapes)}
        textBoxes={pageTextBoxes[pageNum] || []}
        onChangeTextBoxes={(newBoxes) => handlePageTextBoxesChange(pageNum, newBoxes)}
      />
    ),
    [note.id, tool, color, pageStrokes, pageShapes, pageTextBoxes, handlePageStrokesChange, handlePageShapesChange, handlePageTextBoxesChange]
  );

  return (
    <div className="w-full min-h-screen py-3 px-2 sm:px-6 print:p-0 print:m-0 print:w-full">
      <div className="max-w-5xl mx-auto transition-colors print:max-w-none print:p-0 print:m-0">
        {/* Sticky Non-Scrolling Annotation Dock (Hidden in Print) */}
        <AnnotationToolbar
          tool={tool}
          onSelectTool={setTool}
          selectedColor={color}
          onSelectColor={setColor}
          strokeCount={totalAnnotationCount}
          onUndo={handleUndo}
          onClear={handleClear}
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
          className="mb-4"
        />

        {/* Slim Meta Breadcrumb Bar with PDF status & Local File Switcher */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#E8E3D9] dark:border-[#33312E] text-xs text-[#757069] dark:text-[#948F86]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#A85D44] dark:text-[#C4785E]">
              {courseTitle}
            </span>
            <span className="text-stone-400">/</span>
            <span className="font-semibold text-[#2D2926] dark:text-[#E3DFD7]">
              {note.title}
            </span>
            {!effectivePdfSource && (
              <span className="ml-1 px-2 py-0.5 rounded text-[10px] bg-stone-200/60 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-medium">
                HTML Note
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5" suppressHydrationWarning>
              <Calendar className="w-3.5 h-3.5" />
              Updated {formatDate(revision?.updated_at || note.updated_at)}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#5D7063]/10 text-[#5D7063] dark:text-[#768D7D] font-medium text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              Verified Notes
            </span>
          </div>
        </div>

        {/* Informational banner when database has an expired blob: URL from a prior session */}
        {isStaleBlobUrl && (
          <div className="print:hidden mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {renderedContent
                ? "The temporary PDF for this note has expired. Displaying note content."
                : "The temporary PDF for this note has expired."}
            </span>
          </div>
        )}

        {/* PDF Document Continuous Viewer with Per-Page Interactive AnnotationLayer */}
        {effectivePdfSource ? (
          <PdfViewer
            pdfSource={effectivePdfSource}
            activePage={activePage}
            onActivePageChange={setActivePage}
            renderAnnotationLayer={renderAnnotationLayer}
          />
        ) : renderedContent ? (
          /* HTML Note View */
          <div className="relative w-full transition-all">
            <HtmlSandboxedViewer html={renderedContent} />
            <AnnotationLayer
              noteId={note.id}
              tool={tool}
              color={color}
              strokes={pageStrokes[1] || []}
              onChangeStrokes={(strokes) => handlePageStrokesChange(1, strokes)}
              shapes={pageShapes[1] || []}
              onChangeShapes={(shapes) => handlePageShapesChange(1, shapes)}
              textBoxes={pageTextBoxes[1] || []}
              onChangeTextBoxes={(boxes) => handlePageTextBoxesChange(1, boxes)}
            />
          </div>
        ) : (
          /* Empty State: No PDF and No Content */
          <div className="py-20 px-6 text-center max-w-md mx-auto my-8 bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E]">
            <FileText className="w-10 h-10 text-[#A85D44] mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-[#2D2926] dark:text-[#E3DFD7] mb-1">
              No PDF Uploaded
            </h3>
            <p className="text-xs text-[#757069] dark:text-[#948F86]">
              {isStaleBlobUrl
                ? "The temporary PDF upload for this note has expired."
                : "No document has been attached to this note yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
