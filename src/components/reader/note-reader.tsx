"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
import { CheckCircle2, Calendar, FileText, Sparkles, AlertCircle, Globe } from "lucide-react";
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
  const [tool, setTool] = useState<AnnotationTool | null>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return null;
    }
    return "pen";
  });
  const [color, setColor] = useState<string>("#A85D44");
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [shapeWidth, setShapeWidth] = useState<number>(2.0);
  const [shapeFillOpacity, setShapeFillOpacity] = useState<number>(0.0);

  // Active selection states
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null);

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

  // HTML / Web content
  const renderedContent = useMemo(() => {
    if (!blocks || blocks.length === 0) return "";
    const rawHtml = blocksToHtml(blocks);
    return renderMathInHtml(rawHtml);
  }, [blocks]);

  const hasPdf = Boolean(effectivePdfSource);
  const hasHtml = Boolean(
    renderedContent &&
    renderedContent.trim().length > 0 &&
    renderedContent !== "<p></p>"
  );

  // Active view mode: "pdf" | "html"
  const [viewMode, setViewMode] = useState<"pdf" | "html">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vilekh_preferred_reader_view");
        if (saved === "html" && hasHtml) return "html";
        if (saved === "pdf" && hasPdf) return "pdf";
      } catch {
        // Ignore
      }
    }
    return effectivePdfSource ? "pdf" : "html";
  });

  // Keep viewMode synced if note changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("vilekh_preferred_reader_view");
        if (saved === "html" && hasHtml) {
          setViewMode("html");
          return;
        }
        if (saved === "pdf" && hasPdf) {
          setViewMode("pdf");
          return;
        }
      } catch {
        // Ignore
      }
    }
    setViewMode(effectivePdfSource ? "pdf" : "html");
  }, [note.id, effectivePdfSource, hasPdf, hasHtml]);

  const handleSelectViewMode = useCallback((mode: "pdf" | "html") => {
    setViewMode(mode);
    try {
      localStorage.setItem("vilekh_preferred_reader_view", mode);
    } catch {
      // Ignore
    }
  }, []);

  // Compute total strokes, shapes, and text boxes across all pages
  const totalAnnotationCount = useMemo(() => {
    const strokeCount = Object.values(pageStrokes).reduce((acc, list) => acc + (list?.length || 0), 0);
    const shapeCount = Object.values(pageShapes).reduce((acc, list) => acc + (list?.length || 0), 0);
    const boxCount = Object.values(pageTextBoxes).reduce((acc, list) => acc + (list?.length || 0), 0);
    return strokeCount + shapeCount + boxCount;
  }, [pageStrokes, pageShapes, pageTextBoxes]);

  // Document-level Undo and Redo snapshot stacks
  const undoStackRef = useRef<{
    pageNumber: number;
    strokes: AnnotationStroke[];
    shapes: AnnotationShape[];
    textBoxes: AnnotationTextBox[];
  }[]>([]);
  const redoStackRef = useRef<{
    pageNumber: number;
    strokes: AnnotationStroke[];
    shapes: AnnotationShape[];
    textBoxes: AnnotationTextBox[];
  }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Latest page state refs to prevent stale closure captures during rapid history actions
  const pageStrokesRef = useRef(pageStrokes);
  const pageShapesRef = useRef(pageShapes);
  const pageTextBoxesRef = useRef(pageTextBoxes);
  pageStrokesRef.current = pageStrokes;
  pageShapesRef.current = pageShapes;
  pageTextBoxesRef.current = pageTextBoxes;

  const updateHistoryState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  // Records a pre-action state snapshot onto the undo stack
  const handleRecordSnapshot = useCallback(
    (
      pageNum: number,
      beforeState: {
        strokes: AnnotationStroke[];
        shapes: AnnotationShape[];
        textBoxes: AnnotationTextBox[];
      }
    ) => {
      undoStackRef.current.push({
        pageNumber: pageNum,
        strokes: JSON.parse(JSON.stringify(beforeState.strokes)),
        shapes: JSON.parse(JSON.stringify(beforeState.shapes)),
        textBoxes: JSON.parse(JSON.stringify(beforeState.textBoxes)),
      });
      // Cap at 50 history entries
      if (undoStackRef.current.length > 50) {
        undoStackRef.current.shift();
      }
      // Clear redo stack on new action
      redoStackRef.current = [];
      updateHistoryState();
    },
    [updateHistoryState]
  );

  // Undo last action (stroke, shape, erasure, or text box) restoring prior state
  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    const targetSnapshot = undoStackRef.current.pop()!;
    const pageNum = targetSnapshot.pageNumber;

    // Capture current live state of the page before undo and push to redo stack
    const currentStrokes = pageStrokesRef.current[pageNum] || [];
    const currentShapes = pageShapesRef.current[pageNum] || [];
    const currentTextBoxes = pageTextBoxesRef.current[pageNum] || [];

    redoStackRef.current.push({
      pageNumber: pageNum,
      strokes: JSON.parse(JSON.stringify(currentStrokes)),
      shapes: JSON.parse(JSON.stringify(currentShapes)),
      textBoxes: JSON.parse(JSON.stringify(currentTextBoxes)),
    });

    // Restore target snapshot state
    setPageStrokes((prev) => ({ ...prev, [pageNum]: targetSnapshot.strokes }));
    setPageShapes((prev) => ({ ...prev, [pageNum]: targetSnapshot.shapes }));
    setPageTextBoxes((prev) => ({ ...prev, [pageNum]: targetSnapshot.textBoxes }));

    // Persist restored state to localStorage
    try {
      localStorage.setItem(
        `vilekh_pdf_annotations_${note.id}_page_${pageNum}`,
        JSON.stringify(targetSnapshot.strokes)
      );
      localStorage.setItem(
        `vilekh_pdf_shapes_${note.id}_page_${pageNum}`,
        JSON.stringify(targetSnapshot.shapes)
      );
      localStorage.setItem(
        `vilekh_pdf_textboxes_${note.id}_page_${pageNum}`,
        JSON.stringify(targetSnapshot.textBoxes)
      );
      if (pageNum === 1) {
        localStorage.setItem(
          `vilekh_annotations_${note.id}`,
          JSON.stringify(targetSnapshot.strokes)
        );
        localStorage.setItem(
          `vilekh_shapes_${note.id}`,
          JSON.stringify(targetSnapshot.shapes)
        );
        localStorage.setItem(
          `vilekh_textboxes_${note.id}`,
          JSON.stringify(targetSnapshot.textBoxes)
        );
      }
    } catch {
      // Ignore
    }

    if (activePage !== pageNum) {
      setActivePage(pageNum);
    }

    updateHistoryState();
  }, [activePage, note.id, updateHistoryState]);

  // Redo previously undone action
  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    const targetSnapshot = redoStackRef.current.pop()!;
    const pageNum = targetSnapshot.pageNumber;

    // Capture current live state of the page before redo and push to undo stack
    const currentStrokes = pageStrokesRef.current[pageNum] || [];
    const currentShapes = pageShapesRef.current[pageNum] || [];
    const currentTextBoxes = pageTextBoxesRef.current[pageNum] || [];

    undoStackRef.current.push({
      pageNumber: pageNum,
      strokes: JSON.parse(JSON.stringify(currentStrokes)),
      shapes: JSON.parse(JSON.stringify(currentShapes)),
      textBoxes: JSON.parse(JSON.stringify(currentTextBoxes)),
    });

    // Restore target snapshot state
    setPageStrokes((prev) => ({ ...prev, [pageNum]: targetSnapshot.strokes }));
    setPageShapes((prev) => ({ ...prev, [pageNum]: targetSnapshot.shapes }));
    setPageTextBoxes((prev) => ({ ...prev, [pageNum]: targetSnapshot.textBoxes }));

    // Persist restored state to localStorage
    try {
      localStorage.setItem(
        `vilekh_pdf_annotations_${note.id}_page_${pageNum}`,
        JSON.stringify(targetSnapshot.strokes)
      );
      localStorage.setItem(
        `vilekh_pdf_shapes_${note.id}_page_${pageNum}`,
        JSON.stringify(targetSnapshot.shapes)
      );
      localStorage.setItem(
        `vilekh_pdf_textboxes_${note.id}_page_${pageNum}`,
        JSON.stringify(targetSnapshot.textBoxes)
      );
      if (pageNum === 1) {
        localStorage.setItem(
          `vilekh_annotations_${note.id}`,
          JSON.stringify(targetSnapshot.strokes)
        );
        localStorage.setItem(
          `vilekh_shapes_${note.id}`,
          JSON.stringify(targetSnapshot.shapes)
        );
        localStorage.setItem(
          `vilekh_textboxes_${note.id}`,
          JSON.stringify(targetSnapshot.textBoxes)
        );
      }
    } catch {
      // Ignore
    }

    if (activePage !== pageNum) {
      setActivePage(pageNum);
    }

    updateHistoryState();
  }, [activePage, note.id, updateHistoryState]);

  // Global keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Clear annotations on current page or all pages
  const handleClear = useCallback(() => {
    if (totalAnnotationCount === 0) return;

    const clearAll = window.confirm(
      "Clear all annotations across all pages? (Click Cancel to clear only Page " + activePage + ")"
    );

    setActiveTextId(null);
    setActiveShapeId(null);

    // Record snapshot of current activePage before clearing so it can be undone
    handleRecordSnapshot(activePage, {
      strokes: pageStrokesRef.current[activePage] || [],
      shapes: pageShapesRef.current[activePage] || [],
      textBoxes: pageTextBoxesRef.current[activePage] || [],
    });

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
        localStorage.removeItem(`vilekh_annotations_${note.id}`);
        localStorage.removeItem(`vilekh_shapes_${note.id}`);
        localStorage.removeItem(`vilekh_textboxes_${note.id}`);
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
        if (activePage === 1) {
          localStorage.removeItem(`vilekh_annotations_${note.id}`);
          localStorage.removeItem(`vilekh_shapes_${note.id}`);
          localStorage.removeItem(`vilekh_textboxes_${note.id}`);
        }
      } catch {
        // Ignore
      }
    }
  }, [totalAnnotationCount, activePage, handleRecordSnapshot, note.id]);

  // Find currently active text box across pages
  const activeTextBox = useMemo(() => {
    if (!activeTextId) return null;
    for (const page of Object.keys(pageTextBoxes)) {
      const found = pageTextBoxes[Number(page)]?.find((b) => b.id === activeTextId);
      if (found) return found;
    }
    return null;
  }, [activeTextId, pageTextBoxes]);

  // Find currently active shape across pages
  const activeShape = useMemo(() => {
    if (!activeShapeId) return null;
    for (const page of Object.keys(pageShapes)) {
      const found = pageShapes[Number(page)]?.find((s) => s.id === activeShapeId);
      if (found) return found;
    }
    return null;
  }, [activeShapeId, pageShapes]);

  const handleUpdateActiveTextBox = useCallback(
    (updates: Partial<AnnotationTextBox>) => {
      if (!activeTextId) return;
      setPageTextBoxes((prev) => {
        const next = { ...prev };
        for (const pageStr of Object.keys(next)) {
          const pNum = Number(pageStr);
          const list = next[pNum];
          if (list?.some((b) => b.id === activeTextId)) {
            const updatedList = list.map((b) =>
              b.id === activeTextId ? { ...b, ...updates } : b
            );
            next[pNum] = updatedList;
            try {
              localStorage.setItem(
                `vilekh_pdf_textboxes_${note.id}_page_${pNum}`,
                JSON.stringify(updatedList)
              );
            } catch {
              // Ignore
            }
            break;
          }
        }
        return next;
      });
    },
    [activeTextId, note.id]
  );

  const handleDeleteActiveTextBox = useCallback(() => {
    if (!activeTextId) return;
    setPageTextBoxes((prev) => {
      const next = { ...prev };
      for (const pageStr of Object.keys(next)) {
        const pNum = Number(pageStr);
        const list = next[pNum];
        if (list?.some((b) => b.id === activeTextId)) {
          handleRecordSnapshot(pNum, {
            strokes: pageStrokes[pNum] || [],
            shapes: pageShapes[pNum] || [],
            textBoxes: list,
          });
          const updatedList = list.filter((b) => b.id !== activeTextId);
          next[pNum] = updatedList;
          try {
            localStorage.setItem(
              `vilekh_pdf_textboxes_${note.id}_page_${pNum}`,
              JSON.stringify(updatedList)
            );
          } catch {
            // Ignore
          }
          break;
        }
      }
      return next;
    });
    setActiveTextId(null);
  }, [activeTextId, handleRecordSnapshot, note.id, pageShapes, pageStrokes]);

  const handleUpdateActiveShape = useCallback(
    (updates: Partial<AnnotationShape>) => {
      if (!activeShapeId) return;
      setPageShapes((prev) => {
        const next = { ...prev };
        for (const pageStr of Object.keys(next)) {
          const pNum = Number(pageStr);
          const list = next[pNum];
          if (list?.some((s) => s.id === activeShapeId)) {
            const updatedList = list.map((s) =>
              s.id === activeShapeId ? { ...s, ...updates } : s
            );
            next[pNum] = updatedList;
            try {
              localStorage.setItem(
                `vilekh_pdf_shapes_${note.id}_page_${pNum}`,
                JSON.stringify(updatedList)
              );
            } catch {
              // Ignore
            }
            break;
          }
        }
        return next;
      });
    },
    [activeShapeId, note.id]
  );

  const handleDeleteActiveShape = useCallback(() => {
    if (!activeShapeId) return;
    setPageShapes((prev) => {
      const next = { ...prev };
      for (const pageStr of Object.keys(next)) {
        const pNum = Number(pageStr);
        const list = next[pNum];
        if (list?.some((s) => s.id === activeShapeId)) {
          handleRecordSnapshot(pNum, {
            strokes: pageStrokes[pNum] || [],
            shapes: list,
            textBoxes: pageTextBoxes[pNum] || [],
          });
          const updatedList = list.filter((s) => s.id !== activeShapeId);
          next[pNum] = updatedList;
          try {
            localStorage.setItem(
              `vilekh_pdf_shapes_${note.id}_page_${pNum}`,
              JSON.stringify(updatedList)
            );
          } catch {
            // Ignore
          }
          break;
        }
      }
      return next;
    });
    setActiveShapeId(null);
  }, [activeShapeId, handleRecordSnapshot, note.id, pageStrokes, pageTextBoxes]);

  // One-click Client-Side PDF vector export via pdf-lib
  const handleExportPdf = useCallback(async () => {
    if (viewMode === "html" || !effectivePdfSource) {
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
  }, [viewMode, effectivePdfSource, pageStrokes, pageShapes, pageTextBoxes, note.id, note.title]);

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
        penWidth={penWidth}
        shapeWidth={shapeWidth}
        shapeFillOpacity={shapeFillOpacity}
        strokes={pageStrokes[pageNum] || []}
        onChangeStrokes={(newStrokes) => handlePageStrokesChange(pageNum, newStrokes)}
        shapes={pageShapes[pageNum] || []}
        onChangeShapes={(newShapes) => handlePageShapesChange(pageNum, newShapes)}
        textBoxes={pageTextBoxes[pageNum] || []}
        onChangeTextBoxes={(newBoxes) => handlePageTextBoxesChange(pageNum, newBoxes)}
        activeShapeId={activeShapeId}
        onSelectShape={(id) => {
          setActiveShapeId(id);
          if (id) setActiveTextId(null);
        }}
        activeTextId={activeTextId}
        onSelectText={(id) => {
          setActiveTextId(id);
          if (id) setActiveShapeId(null);
        }}
        onRecordSnapshot={(snapshot) => handleRecordSnapshot(pageNum, snapshot)}
      />
    ),
    [
      note.id,
      tool,
      color,
      penWidth,
      shapeWidth,
      shapeFillOpacity,
      pageStrokes,
      pageShapes,
      pageTextBoxes,
      activeShapeId,
      activeTextId,
      handlePageStrokesChange,
      handlePageShapesChange,
      handlePageTextBoxesChange,
      handleRecordSnapshot,
    ]
  );

  return (
    <div className="w-full min-h-screen py-3 px-2 sm:px-6 print:p-0 print:m-0 print:w-full">
      <div className="max-w-5xl mx-auto transition-colors print:max-w-none print:p-0 print:m-0">
        {/* Sticky Non-Scrolling Annotation Dock (Hidden in Print) */}
        <AnnotationToolbar
          tool={tool}
          onSelectTool={(newTool) => {
            setTool(newTool);
            if (newTool !== "text") setActiveTextId(null);
            if (
              newTool !== "rectangle" &&
              newTool !== "circle" &&
              newTool !== "arrow" &&
              newTool !== "line" &&
              newTool !== "star" &&
              newTool !== "cloud"
            ) {
              setActiveShapeId(null);
            }
          }}
          selectedColor={color}
          onSelectColor={setColor}
          strokeCount={totalAnnotationCount}
          onUndo={handleUndo}
          canUndo={canUndo}
          onRedo={handleRedo}
          canRedo={canRedo}
          onClear={handleClear}
          onExportPdf={handleExportPdf}
          isExporting={isExporting}
          className="mb-4"
          penWidth={penWidth}
          onSelectPenWidth={setPenWidth}
          activeTextBox={activeTextBox}
          onUpdateActiveTextBox={handleUpdateActiveTextBox}
          onDeleteActiveTextBox={handleDeleteActiveTextBox}
          onDeselectTextBox={() => setActiveTextId(null)}
          activeShape={activeShape}
          onUpdateActiveShape={handleUpdateActiveShape}
          onDeleteActiveShape={handleDeleteActiveShape}
          onDeselectShape={() => setActiveShapeId(null)}
          shapeWidth={shapeWidth}
          onSelectShapeWidth={setShapeWidth}
          shapeFillOpacity={shapeFillOpacity}
          onSelectShapeFillOpacity={setShapeFillOpacity}
        />

        {/* Slim Meta Breadcrumb Bar with PDF / Web Version Switcher */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#E8E3D9] dark:border-[#33312E] text-xs text-[#757069] dark:text-[#948F86]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#A85D44] dark:text-[#C4785E]">
              {courseTitle}
            </span>
            <span className="text-stone-400">/</span>
            <span className="font-semibold text-[#2D2926] dark:text-[#E3DFD7]">
              {note.title}
            </span>
          </div>

          {/* View Version Switcher: PDF vs Web/HTML */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[#EFEBE3] dark:bg-[#2B2A27] border border-[#E8E3D9] dark:border-[#383532] text-xs font-medium">
            <button
              type="button"
              onClick={() => handleSelectViewMode("pdf")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "pdf"
                  ? "bg-white dark:bg-[#1E1D1B] text-[#A85D44] dark:text-[#C4785E] shadow-xs font-semibold"
                  : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926] dark:hover:text-[#E3DFD7]"
              }`}
              title="Switch to PDF Document View"
              aria-pressed={viewMode === "pdf"}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Version</span>
              {hasPdf && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="PDF Document Available" />
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSelectViewMode("html")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
                viewMode === "html"
                  ? "bg-white dark:bg-[#1E1D1B] text-[#A85D44] dark:text-[#C4785E] shadow-xs font-semibold"
                  : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926] dark:hover:text-[#E3DFD7]"
              }`}
              title="Switch to Interactive Web / HTML View"
              aria-pressed={viewMode === "html"}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Version</span>
              {hasHtml && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Web Version Available" />
              )}
            </button>
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

        {/* Document Body (PDF Viewer or Web HTML Viewer) */}
        {viewMode === "pdf" && effectivePdfSource ? (
          <PdfViewer
            pdfSource={effectivePdfSource}
            activePage={activePage}
            onActivePageChange={setActivePage}
            renderAnnotationLayer={renderAnnotationLayer}
          />
        ) : viewMode === "html" && renderedContent ? (
          /* HTML / Web Version View */
          <div className="relative w-full transition-all bg-[#FAF8F5] dark:bg-[#1C1B19] rounded-2xl p-6 sm:p-12 shadow-sm border border-[#E8E3D9] dark:border-[#33312E] min-h-[600px]">
            <HtmlSandboxedViewer html={renderedContent} />
            <AnnotationLayer
              noteId={note.id}
              pageNumber={1}
              scale={1.0}
              tool={tool}
              color={color}
              penWidth={penWidth}
              shapeWidth={shapeWidth}
              shapeFillOpacity={shapeFillOpacity}
              strokes={pageStrokes[1] || []}
              onChangeStrokes={(strokes) => handlePageStrokesChange(1, strokes)}
              shapes={pageShapes[1] || []}
              onChangeShapes={(shapes) => handlePageShapesChange(1, shapes)}
              textBoxes={pageTextBoxes[1] || []}
              onChangeTextBoxes={(boxes) => handlePageTextBoxesChange(1, boxes)}
              activeShapeId={activeShapeId}
              onSelectShape={(id) => {
                setActiveShapeId(id);
                if (id) setActiveTextId(null);
              }}
              activeTextId={activeTextId}
              onSelectText={(id) => {
                setActiveTextId(id);
                if (id) setActiveShapeId(null);
              }}
              onRecordSnapshot={(snapshot) => handleRecordSnapshot(1, snapshot)}
            />
          </div>
        ) : viewMode === "pdf" && !effectivePdfSource ? (
          /* Empty PDF state */
          <div className="py-20 px-6 text-center max-w-md mx-auto my-8 bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E]">
            <FileText className="w-10 h-10 text-[#A85D44] mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-[#2D2926] dark:text-[#E3DFD7] mb-1">
              No PDF Document Uploaded
            </h3>
            <p className="text-xs text-[#757069] dark:text-[#948F86] mb-4">
              This note was authored as an interactive web note and does not have a PDF document attached.
            </p>
            {hasHtml && (
              <button
                type="button"
                onClick={() => handleSelectViewMode("html")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Switch to Web Version</span>
              </button>
            )}
          </div>
        ) : (
          /* Empty HTML state */
          <div className="py-20 px-6 text-center max-w-md mx-auto my-8 bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E]">
            <Globe className="w-10 h-10 text-[#A85D44] mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-[#2D2926] dark:text-[#E3DFD7] mb-1">
              No Web Version Written Yet
            </h3>
            <p className="text-xs text-[#757069] dark:text-[#948F86] mb-4">
              This note currently only has a PDF document uploaded.
            </p>
            {hasPdf && (
              <button
                type="button"
                onClick={() => handleSelectViewMode("pdf")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Switch to PDF Version</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
