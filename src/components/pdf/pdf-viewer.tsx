"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { initPdfWorker, type PDFDocumentProxy, type PDFPageProxy } from "@/lib/pdf/pdf-init";
import { PdfPageView, type PageDimensions } from "./pdf-page-view";
import { Loader2, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

export interface PdfViewerProps {
  pdfSource: string | ArrayBuffer | Uint8Array | File;
  activePage?: number;
  onActivePageChange?: (page: number) => void;
  onDocumentLoaded?: (doc: PDFDocumentProxy, pageDimensions: Record<number, PageDimensions>) => void;
  renderAnnotationLayer?: (pageNumber: number, dims: PageDimensions) => React.ReactNode;
  className?: string;
}

export function PdfViewer({
  pdfSource,
  activePage: externalActivePage,
  onActivePageChange,
  onDocumentLoaded,
  renderAnnotationLayer,
  className = "",
}: PdfViewerProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [pageDims, setPageDims] = useState<Record<number, PageDimensions>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zoom scale state (1.0 = 100%, 1.25 = 125%)
  const [scale, setScale] = useState<number>(1.2);
  const [internalActivePage, setInternalActivePage] = useState<number>(1);
  const activePage = externalActivePage !== undefined ? externalActivePage : internalActivePage;

  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF document and all page proxies
  useEffect(() => {
    let isCancelled = false;
    let loadingTask: any = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        setPages([]);

        const pdfjs = initPdfWorker();

        let sourceParam: any;
        if (typeof pdfSource === "string") {
          if (pdfSource.startsWith("blob:")) {
            try {
              const testRes = await fetch(pdfSource);
              if (!testRes.ok) throw new Error("Expired session blob");
            } catch {
              throw new Error("This PDF was stored in a temporary browser session that has expired.");
            }
          }
          sourceParam = { url: pdfSource };
        } else if (pdfSource instanceof File) {
          const buffer = await pdfSource.arrayBuffer();
          sourceParam = { data: new Uint8Array(buffer) };
        } else if (pdfSource instanceof ArrayBuffer) {
          sourceParam = { data: new Uint8Array(pdfSource) };
        } else if (pdfSource instanceof Uint8Array) {
          sourceParam = { data: pdfSource };
        } else {
          throw new Error("Invalid PDF source format");
        }

        loadingTask = pdfjs.getDocument(sourceParam);
        const pdfDoc = await loadingTask.promise;
        if (isCancelled) {
          loadingTask.destroy().catch(() => {});
          return;
        }

        setDoc(pdfDoc);

        const loadedPages: PDFPageProxy[] = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (isCancelled) {
            loadingTask.destroy().catch(() => {});
            return;
          }
          const page = await pdfDoc.getPage(i);
          if (isCancelled) {
            loadingTask.destroy().catch(() => {});
            return;
          }
          loadedPages.push(page);
        }

        if (!isCancelled) {
          setPages(loadedPages);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Failed to load PDF:", err);
          setError(err?.message || "Failed to load PDF document");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch {
          // Ignore
        }
      }
    };
  }, [pdfSource]);

  const handleDimensionsLoaded = useCallback((pageNumber: number, dims: PageDimensions) => {
    setPageDims((prev) => {
      const updated = { ...prev, [pageNumber]: dims };
      if (doc && Object.keys(updated).length === doc.numPages) {
        onDocumentLoaded?.(doc, updated);
      }
      return updated;
    });
  }, [doc, onDocumentLoaded]);

  const handlePageVisible = useCallback((pageNumber: number) => {
    setInternalActivePage(pageNumber);
    onActivePageChange?.(pageNumber);
  }, [onActivePageChange]);

  const scrollToPage = useCallback((targetPage: number) => {
    const el = document.getElementById(`pdf-page-${targetPage}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
  };

  const handleZoomReset = () => {
    setScale(1.2);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#A85D44]" />
        <p className="text-sm font-medium">Rendering PDF pages...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-stone-600 dark:text-stone-400 gap-2">
        <AlertCircle className="w-8 h-8 text-amber-600" />
        <p className="text-sm font-semibold">No PDF could be loaded</p>
        <p className="text-xs text-stone-400 max-w-md text-center">{error || "No PDF document found"}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {/* Zoom and Page Navigation Bar */}
      <div className="print:hidden sticky top-36 z-30 flex items-center justify-between gap-3 px-3 py-1.5 mb-4 max-w-fit mx-auto rounded-full bg-[#FAF8F5]/90 dark:bg-[#21201E]/90 backdrop-blur-md border border-[#E8E3D9] dark:border-[#33312E] shadow-xs text-xs text-[#2D2926] dark:text-[#E3DFD7]">
        {/* Page Switcher */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollToPage(Math.max(1, activePage - 1))}
            disabled={activePage <= 1}
            className="p-1 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1 font-medium">
            Page {activePage} of {doc.numPages}
          </span>
          <button
            type="button"
            onClick={() => scrollToPage(Math.min(doc.numPages, activePage + 1))}
            disabled={activePage >= doc.numPages}
            className="p-1 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="w-px h-3.5 bg-stone-300 dark:bg-stone-700" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            className="p-1 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out (-15%)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] w-9 text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5}
            className="p-1 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Zoom In (+15%)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            className="p-1 rounded-full hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors ml-0.5"
            title="Reset Zoom (120%)"
            aria-label="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Continuous Page Scroll Container */}
      <div ref={containerRef} className="w-full flex flex-col items-center gap-6 py-2">
        {pages.map((page, idx) => {
          const pageNum = idx + 1;
          const dims = pageDims[pageNum] || {
            width: Math.floor(page.getViewport({ scale }).width),
            height: Math.floor(page.getViewport({ scale }).height),
            intrinsicWidth: page.getViewport({ scale: 1 }).width,
            intrinsicHeight: page.getViewport({ scale: 1 }).height,
            scale,
          };

          const docKey = (doc as any)?.fingerprints?.[0] || (typeof pdfSource === "string" ? pdfSource : "doc");

          return (
            <PdfPageView
              key={`${docKey}-page-${pageNum}`}
              page={page}
              pageNumber={pageNum}
              scale={scale}
              onPageVisible={handlePageVisible}
              onDimensionsLoaded={handleDimensionsLoaded}
            >
              {renderAnnotationLayer ? renderAnnotationLayer(pageNum, dims) : null}
            </PdfPageView>
          );
        })}
      </div>
    </div>
  );
}

