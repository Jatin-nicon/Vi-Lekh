"use client";

import React from "react";
import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { MessageSquareText } from "lucide-react";

function PromptRoundComponent({ node, updateAttributes }: NodeViewProps) {
  const round = Number(node.attrs.round) || 1;
  const ask = (node.attrs.ask as string) || '"Make me an expense app."';
  const notice = (node.attrs.notice as string) || "A neat list for one person's spending. Nothing about sharing. You never said there were four of you.";

  const getRoundBadgeColor = (r: number) => {
    if (r === 1) return "bg-[#2D4A6E] text-white";
    if (r === 2) return "bg-[#1E3A5F] text-white";
    return "bg-[#D9730D] text-white";
  };

  return (
    <NodeViewWrapper className="my-6 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] p-5 shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Round Badge Indicator */}
        <div className="flex sm:flex-col items-center justify-center shrink-0 gap-1.5 select-none" contentEditable={false}>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${getRoundBadgeColor(round)}`}>
            {round}
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#757069] dark:text-[#948F86]">
            ROUND
          </span>
          <select
            value={round}
            onChange={(e) => updateAttributes({ round: Number(e.target.value) })}
            className="text-xs bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] rounded px-1 py-0.5 outline-none cursor-pointer mt-1"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </div>

        {/* Dual Dialogue Content */}
        <div className="flex-1 w-full space-y-3.5">
          {/* YOU ASK */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#242220] border border-[#E8E3D9] dark:border-[#33312E]">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-[#757069] dark:text-[#948F86] uppercase mb-1 select-none" contentEditable={false}>
              <MessageSquareText className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span>YOU ASK</span>
            </div>
            <textarea
              value={ask}
              onChange={(e) => updateAttributes({ ask: e.target.value })}
              placeholder="What prompt did you send?..."
              rows={2}
              className="w-full text-xs text-[#2D2926] dark:text-[#E3DFD7] font-medium bg-transparent outline-none resize-none leading-relaxed"
            />
          </div>

          {/* YOU GET, AND NOTICE */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-[#242220] border border-[#E8E3D9] dark:border-[#33312E]">
            <div className="text-[10px] font-bold tracking-wider text-[#757069] dark:text-[#948F86] uppercase mb-1 select-none" contentEditable={false}>
              YOU GET, AND NOTICE
            </div>
            <textarea
              value={notice}
              onChange={(e) => updateAttributes({ notice: e.target.value })}
              placeholder="What did the tool return, and what gaps did you notice?..."
              rows={2}
              className="w-full text-xs text-[#2D2926] dark:text-[#E3DFD7] bg-transparent outline-none resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const PromptRoundExtension = Node.create({
  name: "promptRound",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      round: {
        default: 1,
        parseHTML: (el) => Number(el.getAttribute("data-round")) || 1,
        renderHTML: (attrs) => ({
          "data-round": attrs.round || 1,
        }),
      },
      ask: {
        default: '"Make me an expense app."',
        parseHTML: (el) => decodeURIComponent(el.getAttribute("data-ask") || ""),
        renderHTML: (attrs) => ({
          "data-ask": encodeURIComponent(attrs.ask || ""),
        }),
      },
      notice: {
        default: "A neat list for one person's spending. Nothing about sharing. You never said there were four of you.",
        parseHTML: (el) => decodeURIComponent(el.getAttribute("data-notice") || ""),
        renderHTML: (attrs) => ({
          "data-notice": encodeURIComponent(attrs.notice || ""),
          "data-type": "prompt-round",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="prompt-round"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PromptRoundComponent);
  },
});

