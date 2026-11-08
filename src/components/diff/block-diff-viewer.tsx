"use client";

import React from "react";
import type { NoteBlock } from "@/lib/supabase/types";
import { computeBlockDiff, type BlockDiffItem } from "@/lib/diff/block-diff";
import { MathRenderer } from "@/components/editor/math-renderer";
import { Plus, Minus, RefreshCw } from "lucide-react";

interface BlockDiffViewerProps {
  baseBlocks: NoteBlock[];
  proposedBlocks: NoteBlock[];
}

export function BlockDiffViewer({ baseBlocks, proposedBlocks }: BlockDiffViewerProps) {
  const diffs = computeBlockDiff(baseBlocks, proposedBlocks);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-[#757069] dark:text-[#948F86] pb-2 border-b border-[#E8E3D9] dark:border-[#33312E]">
        <span className="font-semibold uppercase tracking-wider text-[11px]">Visual Block Comparison</span>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-[#2D5A43] dark:text-[#86BBA0]">
            <span className="w-2 h-2 rounded-full bg-[#5D7063]" />
            Additions ({diffs.filter((d) => d.type === "added").length})
          </span>
          <span className="flex items-center gap-1.5 text-[#7A5A38] dark:text-[#DDB88C]">
            <span className="w-2 h-2 rounded-full bg-[#A85D44]" />
            Modifications ({diffs.filter((d) => d.type === "modified").length})
          </span>
          <span className="flex items-center gap-1.5 text-[#8A3A3A] dark:text-[#E59898]">
            <span className="w-2 h-2 rounded-full bg-[#8A3A3A]" />
            Deletions ({diffs.filter((d) => d.type === "removed").length})
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {diffs.map((diff, index) => {
          if (diff.type === "unchanged" && diff.proposedBlock) {
            return (
              <div
                key={index}
                className="p-3 rounded-lg border border-transparent hover:border-[#E8E3D9] dark:hover:border-[#33312E] transition-colors opacity-75"
              >
                {renderBlock(diff.proposedBlock)}
              </div>
            );
          }

          if (diff.type === "added" && diff.proposedBlock) {
            return (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-[#C6E2D2] dark:border-[#2D5A43]/50 bg-[#EBF5F0] dark:bg-[#1C2C24]/50 text-[#2D5A43] dark:text-[#86BBA0] relative pl-9"
              >
                <div className="absolute left-3 top-3.5 text-[#2D5A43] dark:text-[#86BBA0]">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#2D5A43] dark:text-[#86BBA0] mb-1">
                  Added Block ({diff.proposedBlock.type})
                </div>
                {renderBlock(diff.proposedBlock)}
              </div>
            );
          }

          if (diff.type === "removed" && diff.baseBlock) {
            return (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-[#ECCACA] dark:border-[#8A3A3A]/50 bg-[#FAF0F0] dark:bg-[#2C1C1C]/50 text-[#8A3A3A] dark:text-[#E59898] relative pl-9 opacity-80"
              >
                <div className="absolute left-3 top-3.5 text-[#8A3A3A] dark:text-[#E59898]">
                  <Minus className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A3A3A] dark:text-[#E59898] mb-1">
                  Removed Block ({diff.baseBlock.type})
                </div>
                <div className="line-through">{renderBlock(diff.baseBlock)}</div>
              </div>
            );
          }

          if (diff.type === "modified" && diff.baseBlock && diff.proposedBlock) {
            return (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-[#EAD9C2] dark:border-[#7A5A38]/50 bg-[#FAF4EC] dark:bg-[#2C241C]/50 text-[#2D2926] dark:text-[#E3DFD7] relative pl-9"
              >
                <div className="absolute left-3 top-3.5 text-[#7A5A38] dark:text-[#DDB88C]">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A5A38] dark:text-[#DDB88C] mb-2">
                  Modified Block ({diff.proposedBlock.type})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#FAF0F0] dark:bg-[#2C1C1C] border border-[#ECCACA] dark:border-[#8A3A3A]/40 text-[#8A3A3A] dark:text-[#E59898]">
                    <span className="text-[10px] font-bold block mb-1">Original:</span>
                    {renderBlock(diff.baseBlock)}
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#EBF5F0] dark:bg-[#1C2C24] border border-[#C6E2D2] dark:border-[#2D5A43]/40 text-[#2D5A43] dark:text-[#86BBA0]">
                    <span className="text-[10px] font-bold block mb-1">Proposed:</span>
                    {renderBlock(diff.proposedBlock)}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

function renderBlock(block: NoteBlock) {
  if (block.type === "image") {
    return (
      <div className="my-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.content}
          alt={(block.props?.alt as string) || "Figure"}
          className="max-h-36 rounded-lg object-contain border border-[#E8E3D9] dark:border-[#33312E]"
        />
      </div>
    );
  }
  if (block.type === "heading") {
    return <div className="font-bold text-base sm:text-lg text-[#2D2926] dark:text-[#E3DFD7]">{block.content}</div>;
  }
  if (block.type === "math") {
    return (
      <div className="py-2 text-center overflow-x-auto">
        <MathRenderer latex={block.content} displayMode />
      </div>
    );
  }
  if (block.type === "code") {
    return (
      <pre className="font-mono text-xs p-2.5 rounded-lg bg-[#252321] text-[#D4C3A3] overflow-x-auto">
        <code>{block.content}</code>
      </pre>
    );
  }
  if (block.type === "callout") {
    return <div className="italic text-xs text-[#2D2926] dark:text-[#E3DFD7]">{block.content}</div>;
  }
  return <div className="text-sm leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]">{block.content}</div>;
}
