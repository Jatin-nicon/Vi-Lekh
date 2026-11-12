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
} from "./annotation-layer";
import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { exportAnnotatedPdf } from "@/lib/pdf/pdf-export";
import { CheckCircle2, Calendar, Upload, FileText, Sparkles } from "lucide-react";
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
  const [tool, setTool] = useState<AnnotationTool>("cursor");
  const [color, setColor] = useState<string>("#A85D44");

  // Per-page annotation maps: pageNumber -> strokes/textBoxes
  const [pageStrokes, setPageStrokes] = useState<Record<number, AnnotationStroke[]>>({});
  const [pageTextBoxes, setPageTextBoxes] = useState<Record<number, AnnotationTextBox[]>>({});

  // Active page tracked during scroll
  const [activePage, setActivePage] = useState<number>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Local PDF file upload state (for offline testing & client-side drops)
  const [localPdfFile, setLocalPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine effective PDF source: local file > revision URL > note URL > fallback default
  const effectivePdfSource = useMemo(() => {
    if (localPdfFile) return localPdfFile;
    if (revision?.pdf_url) return revision.pdf_url;
    if (note.pdf_url) return note.pdf_url;
    if (defaultPdfSource) return defaultPdfSource;
    // Default local sample lecture PDF for seamless verification
    return "/sample-lecture.pdf";
  }, [localPdfFile, revision?.pdf_url, note.pdf_url, defaultPdfSource]);

  // Fallback HTML content for non-PDF notes
  const renderedContent = useMemo(() => {
    if (!blocks || blocks.length === 0) return "";
    const rawHtml = blocksToHtml(blocks);
    return renderMathInHtml(rawHtml);
  }, [blocks]);

  // Compute total strokes and text boxes across all pages
  const totalAnnotationCount = useMemo(() => {
    const strokeCount = Object.values(pageStrokes).reduce((acc, list) => acc + (list?.length || 0), 0);
    const boxCount = Object.values(pageTextBoxes).reduce((acc, list) => acc + (list?.length || 0), 0);
    return strokeCount + boxCount;
  }, [pageStrokes, pageTextBoxes]);

  // Undo last stroke or text box on the active page
  const handleUndo = useCallback(() => {
    const currentPageStrokes = pageStrokes[activePage] || [];
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
  }, [activePage, note.id, pageStrokes, pageTextBoxes]);

  // Clear annotations on current page or all pages
  const handleClear = useCallback(() => {
    if (totalAnnotationCount === 0) return;

    const clearAll = window.confirm(
      "Clear all annotations across all pages? (Click Cancel to clear only Page " + activePage + ")"
    );

    if (clearAll) {
      setPageStrokes({});
      setPageTextBoxes({});
      try {
        for (let i = 1; i <= 100; i++) {
          localStorage.removeItem(`vilekh_pdf_annotations_${note.id}_page_${i}`);
          localStorage.removeItem(`vilekh_pdf_textboxes_${note.id}_page_${i}`);
        }
      } catch {
        // Ignore
      }
    } else {
      setPageStrokes((prev) => ({ ...prev, [activePage]: [] }));
      setPageTextBoxes((prev) => ({ ...prev, [activePage]: [] }));
      try {
        localStorage.removeItem(`vilekh_pdf_annotations_${note.id}_page_${activePage}`);
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
  }, [effectivePdfSource, pageStrokes, pageTextBoxes, note.id, note.title]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setLocalPdfFile(file);
    }
  };

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
            {localPdfFile && (
              <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium">
                Local: {localPdfFile.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Local PDF Selector for testing any file */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer text-[11px]"
              title="Upload your own PDF to annotate"
            >
              <Upload className="w-3 h-3 text-[#A85D44]" />
              <span>{localPdfFile ? "Switch PDF" : "Open PDF"}</span>
            </button>

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

        {/* PDF Document Continuous Viewer with Per-Page Interactive AnnotationLayer */}
        {effectivePdfSource ? (
          <PdfViewer
            pdfSource={effectivePdfSource}
            activePage={activePage}
            onActivePageChange={setActivePage}
            renderAnnotationLayer={(pageNum, dims) => (
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
                onChangeStrokes={(newStrokes) => {
                  setPageStrokes((prev) => ({ ...prev, [pageNum]: newStrokes }));
                }}
                textBoxes={pageTextBoxes[pageNum] || []}
                onChangeTextBoxes={(newBoxes) => {
                  setPageTextBoxes((prev) => ({ ...prev, [pageNum]: newBoxes }));
                }}
              />
            )}
          />
        ) : renderedContent ? (
          /* Legacy HTML Note View Fallback */
          <div className="relative w-full transition-all">
            <HtmlSandboxedViewer html={renderedContent} />
            <AnnotationLayer
              noteId={note.id}
              tool={tool}
              color={color}
              strokes={pageStrokes[1] || []}
              onChangeStrokes={(strokes) => setPageStrokes({ 1: strokes })}
              textBoxes={pageTextBoxes[1] || []}
              onChangeTextBoxes={(boxes) => setPageTextBoxes({ 1: boxes })}
            />
          </div>
        ) : (
          /* Empty State */
          <div className="py-20 text-center text-xs text-[#757069] dark:text-[#948F86]">
            <p>This note has no PDF or content attached.</p>
          </div>
        )}
      </div>
    </div>
  );
}
