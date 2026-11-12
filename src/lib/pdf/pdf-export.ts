"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AnnotationStroke, AnnotationTextBox } from "@/components/reader/annotation-layer";

export interface ExportAnnotatedPdfOptions {
  pdfSource: string | ArrayBuffer | Uint8Array | File;
  strokesMap?: Record<number, AnnotationStroke[]>;
  textBoxesMap?: Record<number, AnnotationTextBox[]>;
  noteId?: string;
  filename?: string;
}

function parseColor(colorStr: string): { r: number; g: number; b: number; a: number } {
  if (!colorStr) return { r: 0.17, g: 0.16, b: 0.15, a: 1 };

  if (colorStr.startsWith("#")) {
    const hex = colorStr.replace("#", "");
    const bigint = parseInt(hex.length === 3 ? hex.split("").map(c => c + c).join("") : hex, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    return { r, g, b, a: 1 };
  }

  if (colorStr.startsWith("rgba") || colorStr.startsWith("rgb")) {
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10) / 255,
        g: parseInt(match[2], 10) / 255,
        b: parseInt(match[3], 10) / 255,
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
    }
  }

  return { r: 0.17, g: 0.16, b: 0.15, a: 1 };
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = `${currentLine} ${word}`;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width < maxWidth - 16) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Loads the source PDF binary, bakes vector strokes, highlighters, underlines,
 * and text boxes directly into the PDF byte stream client-side, and triggers
 * an immediate browser download.
 */
export async function exportAnnotatedPdf({
  pdfSource,
  strokesMap = {},
  textBoxesMap = {},
  noteId,
  filename = "annotated_lecture_notes",
}: ExportAnnotatedPdfOptions): Promise<Uint8Array> {
  // 1. Obtain raw PDF ArrayBuffer
  let sourceBytes: ArrayBuffer;
  if (typeof pdfSource === "string") {
    const res = await fetch(pdfSource);
    sourceBytes = await res.arrayBuffer();
  } else if (pdfSource instanceof File) {
    sourceBytes = await pdfSource.arrayBuffer();
  } else if (pdfSource instanceof ArrayBuffer) {
    sourceBytes = pdfSource;
  } else if (pdfSource instanceof Uint8Array) {
    sourceBytes = pdfSource.buffer.slice(pdfSource.byteOffset, pdfSource.byteOffset + pdfSource.byteLength) as ArrayBuffer;
  } else {
    throw new Error("Unsupported PDF source format");
  }

  // 2. Load PDF document in pdf-lib
  const pdfDoc = await PDFDocument.load(sourceBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 3. Bake annotations page by page
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageNum = pageIdx + 1;
    const page = pages[pageIdx];
    const pageHeight = page.getHeight();
    const pageWidth = page.getWidth();

    // Retrieve strokes for this page (from memory state or localStorage fallback)
    let pageStrokes: AnnotationStroke[] = strokesMap[pageNum] || [];
    if (pageStrokes.length === 0 && noteId && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`vilekh_pdf_annotations_${noteId}_page_${pageNum}`);
        if (stored) {
          pageStrokes = JSON.parse(stored);
        }
      } catch {
        // Ignore
      }
    }

    // Retrieve text boxes for this page (from memory state or localStorage fallback)
    let pageTextBoxes: AnnotationTextBox[] = textBoxesMap[pageNum] || [];
    if (pageTextBoxes.length === 0 && noteId && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`vilekh_pdf_textboxes_${noteId}_page_${pageNum}`);
        if (stored) {
          pageTextBoxes = JSON.parse(stored);
        }
      } catch {
        // Ignore
      }
    }

    // A. Draw Highlighters first (so pen and text draw over them)
    const highlighters = pageStrokes.filter((s) => s.tool === "highlighter");
    for (const hl of highlighters) {
      const parsedColor = parseColor(hl.color);
      const strokeThickness = Math.max(12, hl.width || 18);
      const strokeOpacity = Math.min(0.45, Math.max(0.2, parsedColor.a));

      for (let i = 0; i < hl.points.length - 1; i++) {
        const p1 = hl.points[i];
        const p2 = hl.points[i + 1];

        page.drawLine({
          start: { x: p1.x, y: pageHeight - p1.y },
          end: { x: p2.x, y: pageHeight - p2.y },
          thickness: strokeThickness,
          color: rgb(parsedColor.r, parsedColor.g, parsedColor.b),
          opacity: strokeOpacity,
        });
      }
    }

    // B. Draw Underlines
    const underlines = pageStrokes.filter((s) => s.tool === "underline");
    for (const ul of underlines) {
      if (ul.points.length >= 2) {
        const p1 = ul.points[0];
        const p2 = ul.points[ul.points.length - 1];
        const parsedColor = parseColor(ul.color);

        page.drawLine({
          start: { x: p1.x, y: pageHeight - p1.y },
          end: { x: p2.x, y: pageHeight - p2.y },
          thickness: Math.max(2, ul.width || 3),
          color: rgb(parsedColor.r, parsedColor.g, parsedColor.b),
          opacity: ul.opacity || 0.85,
        });
      }
    }

    // C. Draw Freehand Pen Strokes
    const penStrokes = pageStrokes.filter((s) => s.tool === "pen");
    for (const stroke of penStrokes) {
      const parsedColor = parseColor(stroke.color);
      const strokeThickness = Math.max(1.5, stroke.width || 2.5);

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        page.drawCircle({
          x: p.x,
          y: pageHeight - p.y,
          size: strokeThickness,
          color: rgb(parsedColor.r, parsedColor.g, parsedColor.b),
          opacity: stroke.opacity || 0.95,
        });
      } else {
        for (let i = 0; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i];
          const p2 = stroke.points[i + 1];

          page.drawLine({
            start: { x: p1.x, y: pageHeight - p1.y },
            end: { x: p2.x, y: pageHeight - p2.y },
            thickness: strokeThickness,
            color: rgb(parsedColor.r, parsedColor.g, parsedColor.b),
            opacity: stroke.opacity || 0.95,
          });
        }
      }
    }

    // D. Draw Word/Docs Floating Text Boxes
    for (const box of pageTextBoxes) {
      if (!box.text.trim()) continue;

      const parsedColor = parseColor(box.color);
      const boxWidth = Math.max(120, box.width || 220);
      const fontSize = 11;
      const lineHeight = 15;

      const lines = wrapText(box.text, boxWidth, font, fontSize);
      const totalTextHeight = lines.length * lineHeight;
      const padding = 8;
      const boxHeight = totalTextHeight + padding * 2;

      // Bottom-left Y in PDF coordinate system
      const pdfY = pageHeight - box.y - boxHeight;

      // Card Background with Subtle Border
      page.drawRectangle({
        x: box.x,
        y: Math.max(0, pdfY),
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(parsedColor.r, parsedColor.g, parsedColor.b),
        borderWidth: 1,
        opacity: 0.95,
      });

      // Multiline text lines
      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        if (!line) continue;

        page.drawText(line, {
          x: box.x + padding,
          y: Math.max(0, pdfY + boxHeight - padding - (lineIdx + 1) * lineHeight + 3),
          size: fontSize,
          font,
          color: rgb(parsedColor.r, parsedColor.g, parsedColor.b),
        });
      }
    }
  }

  // 4. Save modified binary
  const modifiedBytes = await pdfDoc.save();

  // 5. Trigger instantaneous client-side download
  if (typeof window !== "undefined") {
    const blob = new Blob([modifiedBytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return modifiedBytes;
}

