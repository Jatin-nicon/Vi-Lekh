"use client";

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, NodeViewProps } from "@tiptap/react";

function CalloutComponent({ node, updateAttributes }: NodeViewProps) {
  const type = ((node.attrs.type as string) || "tip") as "tip" | "warning" | "info";

  const config = {
    tip: {
      label: "TIP",
      icon: "💡",
      border: "border-[#A85D44]/30 dark:border-[#C4785E]/30",
      bg: "bg-[#A85D44]/5 dark:bg-[#C4785E]/10",
      badge: "bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] border-[#A85D44]/30",
    },
    warning: {
      label: "WARNING",
      icon: "⚠️",
      border: "border-amber-500/40 dark:border-amber-500/30",
      bg: "bg-amber-500/10 dark:bg-amber-500/15",
      badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
    },
    info: {
      label: "NOTE",
      icon: "ℹ️",
      border: "border-[#5D7063]/30 dark:border-[#768D7D]/30",
      bg: "bg-[#5D7063]/5 dark:bg-[#768D7D]/10",
      badge: "bg-[#5D7063]/15 text-[#5D7063] dark:text-[#768D7D] border-[#5D7063]/30",
    },
  }[type] || {
    label: "TIP",
    icon: "💡",
    border: "border-[#A85D44]/30 dark:border-[#C4785E]/30",
    bg: "bg-[#A85D44]/5 dark:bg-[#C4785E]/10",
    badge: "bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] border-[#A85D44]/30",
  };

  return (
    <NodeViewWrapper
      className={`my-5 rounded-2xl border ${config.border} ${config.bg} p-4 sm:p-5 backdrop-blur-sm transition-all shadow-sm`}
    >
      <div
        className="flex items-center justify-between mb-2 select-none"
        contentEditable={false}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{config.icon}</span>
          <span
            className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${config.badge}`}
          >
            {config.label}
          </span>
        </div>
        <select
          value={type}
          onChange={(e) => updateAttributes({ type: e.target.value as "tip" | "warning" | "info" })}
          className="text-xs bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] rounded-lg px-2 py-1 text-[#2D2926] dark:text-[#E3DFD7] cursor-pointer outline-none hover:border-[#A85D44]/50 transition-colors"
        >
          <option value="tip">💡 Tip</option>
          <option value="info">ℹ️ Note</option>
          <option value="warning">⚠️ Warning</option>
        </select>
      </div>
      <NodeViewContent className="text-[#2D2926] dark:text-[#E3DFD7] text-sm leading-relaxed outline-none" />
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "tip",
        parseHTML: (element) => element.getAttribute("data-callout-type") || "tip",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
          "data-type": "callout",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
});
