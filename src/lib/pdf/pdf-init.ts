"use client";

import * as pdfjsLib from "pdfjs-dist";

let isWorkerConfigured = false;

export function initPdfWorker() {
  if (typeof window !== "undefined" && !isWorkerConfigured) {
    // Prefer local Next.js served worker, fallback to official CDN if needed
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      isWorkerConfigured = true;
    } catch (e) {
      console.warn("Failed to set local PDF.js worker, falling back to CDN", e);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      isWorkerConfigured = true;
    }
  }
  return pdfjsLib;
}

export { pdfjsLib };
export type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;
export type PDFPageProxy = pdfjsLib.PDFPageProxy;

