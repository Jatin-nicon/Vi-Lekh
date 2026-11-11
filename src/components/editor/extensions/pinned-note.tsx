"use client";

import React from "react";
import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import { Pin } from "lucide-react";

function PinnedNoteComponent() {
  return (
    <NodeViewWrapper className="my-6 rounded-2xl bg-[#FEF9E7] dark:bg-[#2A261A] border border-amber-300/80 dark:border-amber-700/60 p-5 shadow-sm transition-all relative">
      <div className="flex items-center gap-2 mb-2 select-none" contentEditable={false}>
        <div className="w-6 h-6 rounded-full bg-amber-200/80 dark:bg-amber-800/50 flex items-center justify-center text-amber-700 dark:text-amber-300">
          <Pin className="w-3.5 h-3.5 fill-current" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          CORE TAKEAWAY / MANTRA
        </span>
      </div>
      <NodeViewContent className="text-[#2D2926] dark:text-[#E3DFD7] text-sm leading-relaxed font-medium outline-none italic" />
    </NodeViewWrapper>
  );
}

export const PinnedNoteExtension = Node.create({
  name: "pinnedNote",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "pinned",
        renderHTML: () => ({
          "data-type": "pinned-note",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="pinned-note"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PinnedNoteComponent);
  },
});

