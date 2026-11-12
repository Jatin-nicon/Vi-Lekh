"use client";

import React, { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "@/lib/pdf/pdf-init";
import { TextLayer } from "pdfjs-dist";

export interface PageDimensions {
  width: number;
  height: number;
  intrinsicWidth: number;
  intrinsicHeight: number;
  scale: number;
}

interface PdfPageViewProps {
  page: PDFPageProxy;
  pageNumber: number;
  scale: number;
  onPageVisible?: (pageNumber: number) => void;
  onDimensionsLoaded?: (pageNumber: number, dims: PageDimensions) => void;
  children?: React.ReactNode;
}

export function PdfPageView({
  page,
  pageNumber,
  scale,
  onPageVisible,
  onDimensionsLoaded,
  children,
}: PdfPageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [isRendered, setIsRendered] = useState(false);

  const defaultViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale });
  const renderedWidth = Math.floor(viewport.width);
  const renderedHeight = Math.floor(viewport.height);

  useEffect(() => {
    onDimensionsLoaded?.(pageNumber, {
      width: renderedWidth,
      height: renderedHeight,
      intrinsicWidth: defaultViewport.width,
      intrinsicHeight: defaultViewport.height,
      scale,
    });
  }, [pageNumber, renderedWidth, renderedHeight, defaultViewport.width, defaultViewport.height, scale, onDimensionsLoaded]);

  // Track page visibility with IntersectionObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onPageVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            onPageVisible(pageNumber);
          }
        });
      },
      { threshold: [0.1, 0.4, 0.7] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onPageVisible]);

  // Render high-DPI canvas & selectable text layer
  useEffect(() => {
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!canvas || !textLayerDiv) return;

    let isCancelled = false;
    let renderTask: any = null;
    let textLayerInstance: any = null;

    const render = async () => {
      try {
        const outputScale = window.devicePixelRatio || 1;
        const currentViewport = page.getViewport({ scale });

        // High-DPI canvas configuration
        canvas.width = Math.floor(currentViewport.width * outputScale);
        canvas.height = Math.floor(currentViewport.height * outputScale);
        canvas.style.width = `${Math.floor(currentViewport.width)}px`;
        canvas.style.height = `${Math.floor(currentViewport.height)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        renderTask = page.render({
          canvasContext: ctx,
          canvas: canvas,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          viewport: currentViewport,
        });

        await renderTask.promise;
        if (isCancelled) return;

        // Render selectable DOM text layer
        textLayerDiv.innerHTML = "";
        textLayerDiv.style.width = `${Math.floor(currentViewport.width)}px`;
        textLayerDiv.style.height = `${Math.floor(currentViewport.height)}px`;
        textLayerDiv.style.setProperty("--scale-factor", `${currentViewport.scale}`);

        const textContent = await page.getTextContent();
        if (isCancelled) return;

        textLayerInstance = new TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: currentViewport,
        });

        await textLayerInstance.render();
        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Error rendering PDF page ${pageNumber}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // Ignore
        }
      }
      if (textLayerInstance) {
        try {
          textLayerInstance.cancel();
        } catch {
          // Ignore
        }
      }
    };
  }, [page, scale, pageNumber]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      data-page-number={pageNumber}
      className="relative mx-auto my-4 bg-white shadow-md transition-shadow hover:shadow-lg rounded-xs overflow-hidden"
      style={{
        width: `${renderedWidth}px`,
        height: `${renderedHeight}px`,
      }}
    >
      {/* High-DPI Canvas Rendering of PDF graphics & text */}
      <canvas ref={canvasRef} className="absolute inset-0 block select-none pointer-events-none z-0" />

      {/* Transparent DOM text layer for native text selection & copying */}
      <div
        ref={textLayerRef}
        className="textLayer absolute inset-0 select-text z-10"
        style={{
          width: `${renderedWidth}px`,
          height: `${renderedHeight}px`,
        }}
      />

      {/* Slot for per-page interactive AnnotationLayer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {children}
      </div>

      {/* Subtle Page Badge at bottom-right of page */}
      <div className="print:hidden absolute bottom-2 right-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-stone-500 bg-stone-100/80 dark:bg-stone-800/80 backdrop-blur-xs select-none pointer-events-none z-30">
        Page {pageNumber}
      </div>
    </div>
  );
}

