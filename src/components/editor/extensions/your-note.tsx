"use client";

import React from "react";
import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { PenTool } from "lucide-react";

function YourNoteComponent({ node, updateAttributes }: NodeViewProps) {
  const prompt = (node.attrs.prompt as string) || "One task in your life that went from many steps to one tap...";
  const lines = Number(node.attrs.lines) || 3;

  return (
    <NodeViewWrapper className="my-6 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] p-5 shadow-sm transition-all">
      {/* Workbook Note Header */}
      <div className="flex items-center justify-between mb-3 select-none" contentEditable={false}>
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-[#5D7063] dark:text-[#768D7D] uppercase">
          <PenTool className="w-3.5 h-3.5" />
          <span>✎ YOUR NOTE</span>
        </div>

        {/* Rule lines count selector */}
        <div className="flex items-center gap-1.5 text-xs text-[#757069] dark:text-[#948F86]">
          <span>Lines:</span>
          <select
            value={lines}
            onChange={(e) => updateAttributes({ lines: Number(e.target.value) })}
            className="bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] rounded px-1.5 py-0.5 text-xs outline-none cursor-pointer"
          >
            <option value={2}>2 lines</option>
            <option value={3}>3 lines</option>
            <option value={4}>4 lines</option>
            <option value={5}>5 lines</option>
          </select>
        </div>
      </div>

      {/* Editable Prompt */}
      <div className="mb-4">
        <textarea
          value={prompt}
          onChange={(e) => updateAttributes({ prompt: e.target.value })}
          placeholder="Enter student reflection prompt..."
          rows={2}
          className="w-full text-xs font-medium text-[#2D2926] dark:text-[#E3DFD7] bg-transparent border-none outline-none resize-none focus:ring-1 focus:ring-[#5D7063]/30 rounded p-1 leading-relaxed"
        />
      </div>

      {/* Ruled Notebook Lines Preview */}
      <div className="space-y-4 pt-1 select-none" contentEditable={false}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-7 border-b border-dashed border-[#D5CEBF] dark:border-[#3E3B37] flex items-end pb-1"
          >
            <span className="text-[11px] text-stone-300 dark:text-stone-700 italic">
              {i === 0 ? "Learner writing area (blank rules rendered on print)..." : ""}
            </span>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

export const YourNoteExtension = Node.create({
  name: "yourNote",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      prompt: {
        default: "One task in your life that went from many steps to one tap...",
        parseHTML: (el) => decodeURIComponent(el.getAttribute("data-prompt") || ""),
        renderHTML: (attrs) => ({
          "data-prompt": encodeURIComponent(attrs.prompt || ""),
        }),
      },
      lines: {
        default: 3,
        parseHTML: (el) => Number(el.getAttribute("data-lines")) || 3,
        renderHTML: (attrs) => ({
          "data-lines": attrs.lines || 3,
          "data-type": "your-note",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="your-note"]',
      },
      {
        tag: 'div[data-type="workbook-note"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YourNoteComponent);
  },
});

