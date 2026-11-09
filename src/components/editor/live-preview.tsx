"use client";

import React, { useMemo } from "react";
import { htmlToBlocks } from "@/lib/editor/block-converter";
import { MathRenderer } from "./math-renderer";
import { NotionCodeBlock } from "@/components/ui/notion-code-block";
import { Sparkles, Code, CheckCircle2 } from "lucide-react";

interface LivePreviewProps {
  html: string;
  noteTitle: string;
}

export function LivePreview({ html, noteTitle }: LivePreviewProps) {
  const blocks = useMemo(() => htmlToBlocks(html), [html]);

  return (
    <div className="relative flex flex-col min-h-[550px] sm:min-h-[650px] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] shadow-sm overflow-hidden transition-colors">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/60 dark:bg-[#181716]/60 px-5 py-2.5 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#5D7063] animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#757069] dark:text-[#948F86]">
            Reader Simulation Preview
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[#757069] dark:text-[#948F86]">Live sync</span>
      </div>

      {/* Scrollable Preview Canvas */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-5 leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]">
        <div className="pb-4 mb-4 border-b border-[#E8E3D9]/60 dark:border-[#33312E]">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D2926] dark:text-[#E3DFD7]">
            {noteTitle}
          </h1>
        </div>

        {blocks.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#757069]">
            Start typing in the editor on the left to see live reader preview here...
          </div>
        ) : (
          blocks.map((block) => {
            if (block.type === "heading") {
              const level = block.props?.level || 1;
              if (level === 1) {
                return (
                  <h2
                    key={block.id}
                    className="text-2xl font-bold tracking-tight text-[#2D2926] dark:text-[#E3DFD7] pt-4 pb-1 border-b border-[#E8E3D9]/60 dark:border-[#33312E]"
                  >
                    {block.content}
                  </h2>
                );
              }
              if (level === 2) {
                return (
                  <h3
                    key={block.id}
                    className="text-xl font-semibold tracking-tight text-[#2D2926] dark:text-[#E3DFD7] pt-3 pb-1"
                  >
                    {block.content}
                  </h3>
                );
              }
              return (
                <h4 key={block.id} className="text-lg font-medium pt-2">
                  {block.content}
                </h4>
              );
            }

            if (block.type === "image") {
              return (
                <figure key={block.id} className="my-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={block.content}
                    alt={(block.props?.alt as string) || "Note figure"}
                    className="rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] shadow-md max-w-full mx-auto object-contain max-h-[500px]"
                  />
                  {Boolean(block.props?.alt) && (
                    <figcaption className="text-center text-xs text-[#757069] dark:text-[#948F86] mt-2 italic">
                      {String(block.props?.alt)}
                    </figcaption>
                  )}
                </figure>
              );
            }

            if (block.type === "paragraph") {
              return (
                <p key={block.id} className="text-[15px] leading-relaxed">
                  {block.content}
                </p>
              );
            }

            if (block.type === "math") {
              return (
                <div
                  key={block.id}
                  className="my-5 p-4 rounded-xl border border-[#E8E3D9] dark:border-[#383530] bg-[#F7F4EB] dark:bg-[#22201D] text-center overflow-x-auto shadow-sm"
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
              return (
                <div
                  key={block.id}
                  className="my-5 p-4 rounded-xl border border-[#E8E3D9] dark:border-[#383530] bg-[#F7F4EB]/80 dark:bg-[#22201D]/80 flex items-start gap-3.5 text-sm"
                >
                  <div className="p-1 rounded-md bg-[#A85D44]/10 text-[#A85D44] dark:text-[#C4785E] shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="leading-relaxed text-[14px]">{block.content}</div>
                </div>
              );
            }

            if (block.type === "bullet_list") {
              return (
                <li key={block.id} className="ml-5 list-disc text-sm leading-relaxed">
                  {block.content}
                </li>
              );
            }

            if (block.type === "numbered_list") {
              return (
                <li key={block.id} className="ml-5 list-decimal text-sm leading-relaxed">
                  {block.content}
                </li>
              );
            }

            return null;
          })
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center justify-between border-t border-[#E8E3D9]/60 dark:border-[#33312E] bg-[#F5F2EB]/50 dark:bg-[#181716]/50 px-5 py-2 text-[11px] text-[#757069] dark:text-[#948F86] shrink-0">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#5D7063]" />
          Verified formatting
        </span>
        <span>Rendered in Real Time</span>
      </div>
    </div>
  );
}

