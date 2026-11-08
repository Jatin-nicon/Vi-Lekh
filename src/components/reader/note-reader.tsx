"use client";

import React from "react";
import type { Note, Revision, Profile } from "@/lib/supabase/types";
import { MathRenderer } from "@/components/editor/math-renderer";
import { 
  Sparkles, 
  Code, 
  History, 
  GitPullRequest, 
  CheckCircle2, 
  Calendar,
  UserCheck
} from "lucide-react";
import Link from "next/link";
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
  courseTitle = "Machine Learning Foundations",
  onProposeEdit,
  contributors = [],
}: NoteReaderProps) {
  const blocks = revision?.blocks || [];

  // Extract headings for Table of Contents
  const headings = blocks
    .filter((b) => b.type === "heading")
    .map((b) => ({
      id: b.id,
      text: b.content,
      level: b.props?.level || 1,
    }));

  return (
    <div className="w-full py-8 px-4 sm:px-6">
      {/* Centered Physical Paper Sheet */}
      <div className="max-w-3xl mx-auto bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_2px_12px_rgba(45,41,38,0.04)] p-8 sm:p-12 transition-colors">
        
        {/* Note Header / Meta Banner */}
        <div className="pb-8 mb-8 border-b border-[#E8E3D9]/80 dark:border-[#33312E]">
          <div className="flex items-center gap-2 text-xs font-medium text-[#A85D44] dark:text-[#C4785E] mb-2 tracking-wide">
            <span>{courseTitle}</span>
            <span className="text-stone-400">/</span>
            <span className="text-[#757069] dark:text-[#948F86]">Lecture Notes</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2D2926] dark:text-[#E3DFD7] leading-tight">
            {note.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[#E8E3D9]/50 dark:border-[#33312E]/60 text-xs text-[#757069] dark:text-[#948F86]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5" suppressHydrationWarning>
                <Calendar className="w-3.5 h-3.5" />
                Updated {formatDate(revision?.updated_at || note.updated_at)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#5D7063]/10 text-[#5D7063] dark:text-[#768D7D] font-medium text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified by Core Team
              </span>
            </div>

            {/* Subtle, Understated Editorial Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onProposeEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#A85D44]/30 hover:border-[#A85D44] text-[#A85D44] dark:text-[#C4785E] hover:bg-[#A85D44]/5 text-xs font-medium transition-colors"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                Suggest Edits
              </button>
              <Link
                href={`/reviews?note=${note.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] text-[#757069] dark:text-[#948F86] hover:bg-[#F5F2EB] dark:hover:bg-[#292825] text-xs font-medium transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                History
              </Link>
            </div>
          </div>
        </div>

        {/* Note Prose Body */}
        {blocks.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#757069] dark:text-[#948F86]">
            <p className="mb-3">This note has not been populated with content yet.</p>
            <button
              type="button"
              onClick={onProposeEdit}
              className="px-4 py-2 rounded-lg bg-[#A85D44] text-white text-xs font-semibold hover:bg-[#8F4C35] transition-colors"
            >
              Write First Content
            </button>
          </div>
        ) : (
          <article className="note-prose space-y-5 leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]">
            {blocks.map((block) => {
            if (block.type === "heading") {
              const level = block.props?.level || 1;
              if (level === 1) {
                return (
                  <h2
                    key={block.id}
                    id={block.id}
                    className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D2926] dark:text-[#E3DFD7] pt-8 pb-2 border-b border-[#E8E3D9]/60 dark:border-[#33312E]"
                  >
                    {block.content}
                  </h2>
                );
              }
              if (level === 2) {
                return (
                  <h3
                    key={block.id}
                    id={block.id}
                    className="text-xl sm:text-2xl font-semibold tracking-tight text-[#2D2926] dark:text-[#E3DFD7] pt-6 pb-1"
                  >
                    {block.content}
                  </h3>
                );
              }
              return (
                <h4
                  key={block.id}
                  id={block.id}
                  className="text-lg font-medium tracking-tight text-[#2D2926] dark:text-[#E3DFD7] pt-4"
                >
                  {block.content}
                </h4>
              );
            }

            if (block.type === "paragraph") {
              return (
                <p key={block.id} className="text-base sm:text-[17px] leading-[1.8] text-[#2D2926] dark:text-[#E3DFD7]">
                  {block.content}
                </p>
              );
            }

            if (block.type === "math") {
              return (
                <div
                  key={block.id}
                  className="my-6 p-5 rounded-xl border border-[#E8E3D9] dark:border-[#383530] bg-[#F7F4EB] dark:bg-[#22201D] text-center overflow-x-auto shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <MathRenderer latex={block.content} displayMode />
                </div>
              );
            }

            if (block.type === "code") {
              return (
                <div
                  key={block.id}
                  className="my-6 rounded-xl border border-[#3A3632] bg-[#252321] text-[#E8DCC4] overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-[#1E1C1A] text-xs text-[#9E9689] border-b border-[#3A3632]">
                    <span className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Code className="w-3.5 h-3.5 text-[#C4785E]" />
                      {block.props?.language || "python"}
                    </span>
                  </div>
                  <pre className="p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto text-[#D4C3A3]">
                    <code>{block.content}</code>
                  </pre>
                </div>
              );
            }

            if (block.type === "callout") {
              return (
                <div
                  key={block.id}
                  className="my-6 p-4 rounded-xl border border-[#E8E3D9] dark:border-[#383530] bg-[#F7F4EB]/80 dark:bg-[#22201D]/80 flex items-start gap-3.5 text-sm text-[#2D2926] dark:text-[#E3DFD7]"
                >
                  <div className="p-1 rounded-md bg-[#A85D44]/10 text-[#A85D44] dark:text-[#C4785E] shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="leading-relaxed text-[15px]">{block.content}</div>
                </div>
              );
            }

            if (block.type === "bullet_list") {
              return (
                <li key={block.id} className="ml-5 list-disc text-base leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]">
                  {block.content}
                </li>
              );
            }

            return null;
          })}
        </article>
        )}

        {/* Notebook Footer Credits */}
        <div className="mt-12 pt-6 border-t border-[#E8E3D9]/60 dark:border-[#33312E] flex items-center justify-between text-xs text-[#757069] dark:text-[#948F86]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#5D7063] dark:text-[#768D7D]" />
            <span>Curated by <strong>Alex Rivera</strong> & community contributors</span>
          </div>
          <span>Vi-Lekh Notebooks</span>
        </div>
      </div>
    </div>
  );
}
