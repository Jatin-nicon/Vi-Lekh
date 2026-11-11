"use client";

import React, { useMemo } from "react";
import type { Note, Revision, Profile } from "@/lib/supabase/types";
import { blocksToHtml } from "@/lib/editor/block-converter";
import { renderMathInHtml } from "@/lib/editor/math-html";
import { HtmlSandboxedViewer } from "@/components/editor/html-sandboxed-viewer";
import { CheckCircle2, Calendar, Printer } from "lucide-react";
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

  const renderedContent = useMemo(() => {
    if (!blocks || blocks.length === 0) return "";
    const rawHtml = blocksToHtml(blocks);
    return renderMathInHtml(rawHtml);
  }, [blocks]);

  return (
    <div className="w-full min-h-screen py-4 px-2 sm:px-6 print:p-0 print:m-0 print:w-full">
      <div className="max-w-5xl mx-auto transition-colors print:max-w-none print:p-0 print:m-0">
        {/* Slim Top Action & Meta Bar (Hidden in Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E8E3D9] dark:border-[#33312E] text-xs text-[#757069] dark:text-[#948F86]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#A85D44] dark:text-[#C4785E]">
              {courseTitle}
            </span>
            <span className="text-stone-400">/</span>
            <span>{note.title}</span>
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
            <button
              onClick={() => window.print()}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] text-xs font-medium text-[#2D2926] dark:text-[#E3DFD7] transition-colors cursor-pointer"
              title="Print Note (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Style-Isolated HTML Note Content */}
        {!renderedContent ? (
          <div className="py-20 text-center text-xs text-[#757069] dark:text-[#948F86]">
            <p>This note has not been published with content yet.</p>
          </div>
        ) : (
          <div className="w-full">
            <HtmlSandboxedViewer html={renderedContent} />
          </div>
        )}
      </div>
    </div>
  );
}
