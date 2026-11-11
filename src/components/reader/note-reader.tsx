"use client";

import React, { useState, useEffect } from "react";
import type { Note, Revision, Profile } from "@/lib/supabase/types";
import { MathRenderer } from "@/components/editor/math-renderer";
import { NotionCodeBlock } from "@/components/ui/notion-code-block";
import type { FlowStep } from "@/components/editor/extensions/process-flow";
import type { ConceptCard } from "@/components/editor/extensions/card-grid";
import { 
  CheckCircle2, 
  Calendar,
  UserCheck,
  Printer,
  PenTool,
  Pin
} from "lucide-react";
import { formatDate } from "@/lib/utils";

function FlowRenderer({ title, steps }: { title?: string; steps?: FlowStep[] }) {
  const stepList = steps || [];
  if (stepList.length === 0) return null;

  return (
    <div className="my-8 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] p-5 shadow-sm print:bg-white print:border-[#D5CEBF] print:shadow-none print:break-inside-avoid">
      {title && (
        <h4 className="font-bold text-sm text-[#2D2926] dark:text-[#E3DFD7] mb-4 pb-2 border-b border-[#E8E3D9]/60 dark:border-[#33312E] flex items-center gap-2 print:text-black print:border-[#D5CEBF]">
          <span>{title}</span>
        </h4>
      )}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {stepList.map((step, idx) => (
          <React.Fragment key={step.id || idx}>
            <div
              className={`flex-1 w-full md:w-auto min-w-[150px] rounded-xl p-3.5 border transition-all print:break-inside-avoid ${
                step.highlighted
                  ? "bg-[#FEF9E7] dark:bg-[#2A261A] border-amber-300 dark:border-amber-700/60 shadow-sm print:bg-[#FFFDE7] print:border-amber-400"
                  : "bg-white dark:bg-[#242220] border-[#E8E3D9] dark:border-[#33312E] print:bg-white print:border-[#D5CEBF]"
              }`}
            >
              <div className="text-xl mb-1.5 select-none">{step.icon || "•"}</div>
              <h5 className="font-semibold text-xs text-[#2D2926] dark:text-[#E3DFD7] leading-snug mb-1 print:text-black">
                {step.title}
              </h5>
              <p className="text-[11px] text-[#757069] dark:text-[#948F86] leading-relaxed print:text-stone-700">
                {step.description}
              </p>
            </div>
            {idx < stepList.length - 1 && (
              <div className="text-stone-400 dark:text-stone-500 py-1 md:py-0 shrink-0 select-none print:text-black">
                <span className="hidden md:inline font-bold text-sm">→</span>
                <span className="inline md:hidden font-bold text-sm">↓</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function YourNoteRenderer({
  noteId,
  blockId,
  prompt,
  lines = 3,
}: {
  noteId: string;
  blockId: string;
  prompt: string;
  lines?: number;
}) {
  const storageKey = `vilekh_reflection_${noteId}_${blockId}`;
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setReflection(saved);
    } catch {
      // Ignore
    }
  }, [storageKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReflection(val);
    try {
      localStorage.setItem(storageKey, val);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="my-8 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] p-5 shadow-sm print:bg-white print:border-[#D5CEBF] print:shadow-none print:break-inside-avoid">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#5D7063] dark:text-[#768D7D] uppercase print:text-stone-800">
          <PenTool className="w-3.5 h-3.5" />
          <span>✎ YOUR NOTE</span>
        </div>
        <span className="text-[10px] text-[#757069] dark:text-[#948F86] print:hidden">
          {reflection ? "Saved locally" : "Type your answer"}
        </span>
      </div>

      <p className="text-xs font-medium text-[#2D2926] dark:text-[#E3DFD7] leading-relaxed mb-3 print:text-black">
        {prompt}
      </p>

      {/* Interactive textarea on screen */}
      <div className="relative print:hidden">
        <textarea
          value={reflection}
          onChange={handleChange}
          placeholder="Write your answer or thoughts here..."
          rows={Math.max(lines, 2)}
          className="w-full text-xs font-normal text-[#2D2926] dark:text-[#E3DFD7] bg-white/70 dark:bg-[#242220]/70 border border-[#E8E3D9] dark:border-[#33312E] rounded-xl p-3 outline-none focus:border-[#5D7063] transition-colors leading-relaxed resize-y"
        />
      </div>

      {/* Ruled handwriting lines on print */}
      <div className="hidden print:block space-y-4 pt-2">
        {reflection ? (
          <p className="text-xs text-black whitespace-pre-wrap leading-relaxed border-b border-stone-300 pb-2">
            {reflection}
          </p>
        ) : (
          Array.from({ length: Math.max(lines, 2) }).map((_, i) => (
            <div key={i} className="h-6 border-b border-dashed border-stone-400" />
          ))
        )}
      </div>
    </div>
  );
}

function CardGridRenderer({ cards = [] }: { cards?: ConceptCard[] }) {
  if (cards.length === 0) return null;

  return (
    <div className="my-8 grid grid-cols-1 md:grid-cols-2 gap-4 print:break-inside-avoid">
      {cards.map((card, idx) => {
        let borderClass = "border border-[#E8E3D9] dark:border-[#33312E]";
        if (card.accent === "pitfall") {
          borderClass = "border-l-4 border-l-rose-500 border-t border-r border-b border-[#E8E3D9] dark:border-[#33312E]";
        } else if (card.accent === "solution") {
          borderClass = "border-l-4 border-l-emerald-600 border-t border-r border-b border-[#E8E3D9] dark:border-[#33312E]";
        } else if (card.accent === "dashed") {
          borderClass = "border-2 border-dashed border-[#D5CEBF] dark:border-[#45423E]";
        }

        return (
          <div
            key={card.id || idx}
            className={`rounded-2xl p-4 bg-[#FAF8F5] dark:bg-[#1E1C1B] transition-all print:bg-white print:border-[#D5CEBF] print:break-inside-avoid ${borderClass}`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base select-none">{card.icon || "💡"}</span>
              <h5 className="font-bold text-xs uppercase tracking-wide text-[#2D2926] dark:text-[#E3DFD7] print:text-black">
                {card.title}
              </h5>
            </div>

            {card.content && (
              <p className="text-xs text-[#2D2926] dark:text-[#E3DFD7] leading-relaxed mb-2 print:text-black">
                {card.content}
              </p>
            )}

            {card.fix && (
              <p className="text-xs font-medium text-[#5D7063] dark:text-[#768D7D] leading-relaxed mb-2 print:text-stone-800">
                {card.fix}
              </p>
            )}

            {card.inOtherWords && (
              <p className="text-[11px] italic text-[#757069] dark:text-[#948F86] border-t border-[#E8E3D9]/60 dark:border-[#33312E] pt-2 mt-2 leading-relaxed print:text-stone-700 print:border-[#E0E0E0]">
                {card.inOtherWords.startsWith("In other words") ? card.inOtherWords : `In other words: ${card.inOtherWords}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PromptRoundRenderer({ round = 1, ask = "", notice = "" }: { round?: number; ask?: string; notice?: string }) {
  const getRoundBadgeColor = (r: number) => {
    if (r === 1) return "bg-[#2D4A6E] text-white";
    if (r === 2) return "bg-[#1E3A5F] text-white";
    return "bg-[#D9730D] text-white";
  };

  return (
    <div className="my-8 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] p-5 shadow-sm print:bg-white print:border-[#D5CEBF] print:shadow-none print:break-inside-avoid">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Round Badge */}
        <div className="flex sm:flex-col items-center justify-center shrink-0 gap-1 select-none">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-sm print:bg-stone-800 print:text-white ${getRoundBadgeColor(round)}`}>
            {round}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#757069] dark:text-[#948F86] print:text-stone-800">
            ROUND
          </span>
        </div>

        {/* Dual Dialogue */}
        <div className="flex-1 w-full space-y-3">
          {ask && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#242220] border border-[#E8E3D9] dark:border-[#33312E] print:bg-white print:border-[#D5CEBF]">
              <div className="text-[10px] font-bold tracking-wider text-[#757069] dark:text-[#948F86] uppercase mb-1 print:text-stone-700">
                YOU ASK
              </div>
              <p className="text-xs font-medium text-[#2D2926] dark:text-[#E3DFD7] leading-relaxed print:text-black">
                {ask}
              </p>
            </div>
          )}

          {notice && (
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#242220] border border-[#E8E3D9] dark:border-[#33312E] print:bg-white print:border-[#D5CEBF]">
              <div className="text-[10px] font-bold tracking-wider text-[#757069] dark:text-[#948F86] uppercase mb-1 print:text-stone-700">
                YOU GET, AND NOTICE
              </div>
              <p className="text-xs text-[#2D2926] dark:text-[#E3DFD7] leading-relaxed print:text-black">
                {notice}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PinnedNoteRenderer({ content = "" }: { content?: string }) {
  return (
    <div className="my-8 rounded-2xl bg-[#FEF9E7] dark:bg-[#2A261A] border border-amber-300/80 dark:border-amber-700/60 p-5 shadow-sm transition-all relative print:bg-[#FFFDE7] print:border-amber-400 print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-2 select-none">
        <div className="w-5 h-5 rounded-full bg-amber-200/80 dark:bg-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-300 print:text-black">
          <Pin className="w-3 h-3 fill-current" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 print:text-stone-800">
          CORE TAKEAWAY / MANTRA
        </span>
      </div>
      <div
        className="text-[#2D2926] dark:text-[#E3DFD7] text-sm leading-relaxed font-medium italic print:text-black"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

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
    <div className="w-full py-8 px-4 sm:px-6 print:p-0 print:m-0 print:w-full">
      {/* Centered Physical Paper Sheet */}
      <div className="print-sheet max-w-3xl mx-auto bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_2px_12px_rgba(45,41,38,0.04)] p-8 sm:p-12 transition-colors print:shadow-none print:border-none print:p-0 print:max-w-none print:bg-white print:dark:bg-white">
        
        {/* Note Header / Meta Banner */}
        <div className="pb-8 mb-8 border-b border-[#E8E3D9]/80 dark:border-[#33312E] print:border-[#E0E0E0] print:pb-4 print:mb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-[#A85D44] dark:text-[#C4785E] mb-2 tracking-wide print:text-stone-700">
            <span>{courseTitle}</span>
            <span className="text-stone-400">/</span>
            <span className="text-[#757069] dark:text-[#948F86] print:text-stone-600">Lecture Notes</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#2D2926] dark:text-[#E3DFD7] leading-tight print:text-black">
            {note.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-[#E8E3D9]/50 dark:border-[#33312E]/60 text-xs text-[#757069] dark:text-[#948F86] print:border-[#E0E0E0] print:mt-3 print:pt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5" suppressHydrationWarning>
                <Calendar className="w-3.5 h-3.5" />
                Updated {formatDate(revision?.updated_at || note.updated_at)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#5D7063]/10 text-[#5D7063] dark:text-[#768D7D] font-medium text-[11px] print:bg-transparent print:p-0 print:text-stone-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Academic Notes
              </span>
            </div>

            {/* Print Note Action Button */}
            <button
              onClick={() => window.print()}
              type="button"
              className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors cursor-pointer"
              title="Print Note (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span>Print Note</span>
            </button>
          </div>

          {/* Academic Handout / Worksheet Name & Date blanks */}
          <div className="mt-4 pt-3 border-t border-[#E8E3D9]/60 dark:border-[#33312E] flex flex-wrap items-center justify-between gap-4 text-xs text-[#757069] dark:text-[#948F86] print:border-[#E0E0E0] print:text-black">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#A85D44] dark:text-[#C4785E] print:text-black">Name:</span>
              <span className="inline-block w-48 border-b border-stone-400 dark:border-stone-600 print:border-black" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#A85D44] dark:text-[#C4785E] print:text-black">Date:</span>
              <span className="inline-block w-32 border-b border-stone-400 dark:border-stone-600 print:border-black" />
            </div>
          </div>
        </div>

        {/* Note Prose Body */}
        {blocks.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#757069] dark:text-[#948F86]">
            <p>This note has not been published with content yet.</p>
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
              if (!block.content?.trim()) return null;
              return (
                <p
                  key={block.id}
                  className="text-base sm:text-[17px] leading-[1.8] text-[#2D2926] dark:text-[#E3DFD7]"
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
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
                <NotionCodeBlock
                  key={block.id}
                  code={block.content}
                  language={(block.props?.language as string) || "python"}
                />
              );
            }

            if (block.type === "callout") {
              const calloutType = (block.props?.calloutType as string) || "tip";
              const icon = calloutType === "warning" ? "⚠️" : calloutType === "info" ? "ℹ️" : "💡";
              return (
                <div
                  key={block.id}
                  className="my-6 p-4 rounded-xl border border-[#E8E3D9] dark:border-[#383530] bg-[#F7F4EB]/80 dark:bg-[#22201D]/80 flex items-start gap-3.5 text-sm text-[#2D2926] dark:text-[#E3DFD7]"
                >
                  <span className="text-base select-none shrink-0 mt-0.5">{icon}</span>
                  <div
                    className="leading-relaxed text-[15px]"
                    dangerouslySetInnerHTML={{ __html: block.content }}
                  />
                </div>
              );
            }

            if (block.type === "bullet_list") {
              return (
                <li
                  key={block.id}
                  className="ml-5 list-disc text-base leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]"
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              );
            }

            if (block.type === "numbered_list") {
              return (
                <li
                  key={block.id}
                  className="ml-5 list-decimal text-base leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]"
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              );
            }

            if (block.type === "image") {
              return (
                <figure key={block.id} className="my-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.content}
                    alt={String(block.props?.alt || "Illustration")}
                    className="rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] shadow-md max-w-full mx-auto object-contain max-h-[550px]"
                  />
                  {Boolean(block.props?.alt) && (
                    <figcaption className="text-center text-xs text-[#757069] dark:text-[#948F86] mt-2.5 italic">
                      {String(block.props?.alt)}
                    </figcaption>
                  )}
                </figure>
              );
            }

            if (block.type === "flow") {
              const steps = (block.props?.steps as FlowStep[]) || [];
              const title = (block.props?.title as string) || block.content || "";
              return <FlowRenderer key={block.id} title={title} steps={steps} />;
            }

            if (block.type === "your_note") {
              const prompt = (block.props?.prompt as string) || block.content || "Your reflection note...";
              const lines = Number(block.props?.lines) || 3;
              return (
                <YourNoteRenderer
                  key={block.id}
                  noteId={note.id}
                  blockId={block.id}
                  prompt={prompt}
                  lines={lines}
                />
              );
            }

            if (block.type === "card_grid") {
              const cards = (block.props?.cards as ConceptCard[]) || [];
              return <CardGridRenderer key={block.id} cards={cards} />;
            }

            if (block.type === "round_dialogue") {
              const round = Number(block.props?.round) || 1;
              const ask = (block.props?.ask as string) || "";
              const notice = (block.props?.notice as string) || "";
              return <PromptRoundRenderer key={block.id} round={round} ask={ask} notice={notice} />;
            }

            if (block.type === "pinned_note") {
              return <PinnedNoteRenderer key={block.id} content={block.content} />;
            }

            return null;
          })}
        </article>
        )}

        {/* Notebook Footer Credits */}
        <div className="mt-12 pt-6 border-t border-[#E8E3D9]/60 dark:border-[#33312E] flex items-center justify-between text-xs text-[#757069] dark:text-[#948F86] print:border-[#E0E0E0] print:text-stone-600 print:mt-8 print:pt-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#5D7063] dark:text-[#768D7D] print:text-stone-700" />
            <span>Curated by Authoritative Course Maintainers</span>
          </div>
          <span>Vi-Lekh Notebooks</span>
        </div>
      </div>
    </div>
  );
}
