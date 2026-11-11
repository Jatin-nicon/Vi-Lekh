"use client";

import React, { useMemo, useState, useCallback } from "react";
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
import { CheckCircle2, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface NoteReaderProps {
  note: Note;
  revision?: Revision | null;
  courseTitle?: string;
  onProposeEdit?: () => void;
  contributors?: Profile[];
}

export function NoteReader({
  note,
  revision,
  courseTitle = "Course Notes",
}: NoteReaderProps) {
  const blocks = revision?.blocks || [];

  // Annotation states
  const [tool, setTool] = useState<AnnotationTool>("cursor");
  const [color, setColor] = useState<string>("#A85D44");
  const [strokes, setStrokes] = useState<AnnotationStroke[]>([]);
  const [textBoxes, setTextBoxes] = useState<AnnotationTextBox[]>([]);

  const renderedContent = useMemo(() => {
    if (!blocks || blocks.length === 0) return "";
    const rawHtml = blocksToHtml(blocks);
    return renderMathInHtml(rawHtml);
  }, [blocks]);

  // Undo last stroke or text box
  const handleUndo = useCallback(() => {
    if (strokes.length > 0) {
      setStrokes((prev) => {
        const updated = prev.slice(0, -1);
        try {
          localStorage.setItem(`vilekh_annotations_${note.id}`, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    } else if (textBoxes.length > 0) {
      setTextBoxes((prev) => {
        const updated = prev.slice(0, -1);
        try {
          localStorage.setItem(`vilekh_textboxes_${note.id}`, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    }
  }, [note.id, strokes.length, textBoxes.length]);

  // Clear all annotations (strokes and text boxes)
  const handleClear = useCallback(() => {
    if (strokes.length === 0 && textBoxes.length === 0) return;
    if (window.confirm("Clear all annotations on this note?")) {
      setStrokes([]);
      setTextBoxes([]);
      try {
        localStorage.removeItem(`vilekh_annotations_${note.id}`);
        localStorage.removeItem(`vilekh_textboxes_${note.id}`);
      } catch {
        // Ignore
      }
    }
  }, [strokes.length, textBoxes.length, note.id]);

  // One-click PDF export
  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="w-full min-h-screen py-3 px-2 sm:px-6 print:p-0 print:m-0 print:w-full">
      <div className="max-w-5xl mx-auto transition-colors print:max-w-none print:p-0 print:m-0">
        {/* Sticky Non-Scrolling Annotation Dock (Hidden in Print) */}
        <AnnotationToolbar
          tool={tool}
          onSelectTool={setTool}
          selectedColor={color}
          onSelectColor={setColor}
          strokeCount={strokes.length + textBoxes.length}
          onUndo={handleUndo}
          onClear={handleClear}
          onExportPdf={handleExportPdf}
          className="mb-4"
        />

        {/* Slim Meta Breadcrumb Bar (Hidden in Print) */}
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

          <div className="flex items-center gap-4">
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

        {/* Note Document with Overlay Annotation Layer */}
        {!renderedContent ? (
          <div className="py-20 text-center text-xs text-[#757069] dark:text-[#948F86]">
            <p>This note has not been published with content yet.</p>
          </div>
        ) : (
          <div className="relative w-full transition-all">
            {/* Base HTML Document Rendered in Shadow DOM */}
            <HtmlSandboxedViewer html={renderedContent} />

            {/* Transparent Vector SVG & Text Box Annotation Canvas */}
            <AnnotationLayer
              noteId={note.id}
              tool={tool}
              color={color}
              strokes={strokes}
              onChangeStrokes={setStrokes}
              textBoxes={textBoxes}
              onChangeTextBoxes={setTextBoxes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
