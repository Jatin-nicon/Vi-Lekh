"use client";

import React from "react";
import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Plus, Trash2, ArrowRight, Star, Sparkles } from "lucide-react";

export interface FlowStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  highlighted?: boolean;
}

function safeEncode(val: unknown): string {
  try {
    return encodeURIComponent(JSON.stringify(val));
  } catch {
    return "";
  }
}

function safeDecode<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(decodeURIComponent(val));
  } catch {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
}

function ProcessFlowComponent({ node, updateAttributes }: NodeViewProps) {
  const title = (node.attrs.title as string) || "★ Each generation hides a layer of hard work";
  const steps: FlowStep[] = (node.attrs.steps as FlowStep[]) || [
    { id: "1", icon: "🔌", title: "Switches & cards", description: "talk to the machine in its own code" },
    { id: "2", icon: "⌨️", title: "Programming languages", description: "write rules in near-English" },
    { id: "3", icon: "📦", title: "Ready-made blocks", description: "reuse what others wrote" },
    { id: "4", icon: "💬", title: "Plain-language requests", description: "describe it; AI writes the code", highlighted: true },
  ];

  const handleUpdateStep = (index: number, partial: Partial<FlowStep>) => {
    const updated = steps.map((s, i) => (i === index ? { ...s, ...partial } : s));
    updateAttributes({ steps: updated });
  };

  const handleAddStep = () => {
    const newStep: FlowStep = {
      id: "step_" + Math.random().toString(36).slice(2, 7),
      icon: "✨",
      title: "Next step",
      description: "describe this stage",
      highlighted: false,
    };
    updateAttributes({ steps: [...steps, newStep] });
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== index);
    updateAttributes({ steps: updated });
  };

  return (
    <NodeViewWrapper className="my-6 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] p-5 shadow-sm transition-all">
      {/* Flow Header with Editable Title */}
      <div className="flex items-center justify-between gap-3 mb-4 select-none border-b border-[#E8E3D9]/60 dark:border-[#33312E] pb-3" contentEditable={false}>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles className="w-4 h-4 text-[#A85D44] dark:text-[#C4785E]" />
          <input
            type="text"
            value={title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
            placeholder="Flow title (e.g. ★ Process Evolution)..."
            className="font-bold text-sm bg-transparent text-[#2D2926] dark:text-[#E3DFD7] border-none outline-none focus:ring-1 focus:ring-[#A85D44]/30 rounded px-1.5 py-0.5 w-full max-w-md"
          />
        </div>
        <button
          type="button"
          onClick={handleAddStep}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#33312E] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Step</span>
        </button>
      </div>

      {/* Horizontal Steps Track */}
      <div className="flex flex-col md:flex-row items-center gap-2.5 overflow-x-auto py-2">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id || idx}>
            {/* Step Card */}
            <div
              className={`flex-1 min-w-[170px] w-full md:w-auto rounded-xl p-3.5 border transition-all ${
                step.highlighted
                  ? "bg-[#FEF9E7] dark:bg-[#2A261A] border-amber-300 dark:border-amber-700/60 shadow-sm"
                  : "bg-white dark:bg-[#242220] border-[#E8E3D9] dark:border-[#33312E]"
              }`}
            >
              {/* Card Controls */}
              <div className="flex items-center justify-between mb-2" contentEditable={false}>
                {/* Emoji Selector / Input */}
                <input
                  type="text"
                  value={step.icon}
                  onChange={(e) => handleUpdateStep(idx, { icon: e.target.value })}
                  className="w-7 h-7 text-center text-sm rounded bg-[#FAF8F5] dark:bg-[#1E1C1B] border border-[#E8E3D9] dark:border-[#33312E] outline-none"
                  title="Step icon / emoji"
                />

                <div className="flex items-center gap-1">
                  {/* Highlight Toggle */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStep(idx, { highlighted: !step.highlighted })}
                    title={step.highlighted ? "Remove highlight" : "Highlight this step"}
                    className={`p-1 rounded text-xs transition-colors ${
                      step.highlighted
                        ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40"
                        : "text-[#757069] hover:bg-stone-100 dark:hover:bg-stone-800"
                    }`}
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </button>

                  {/* Remove Step */}
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(idx)}
                      title="Delete step"
                      className="p-1 rounded text-[#757069] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Step Title Input */}
              <input
                type="text"
                value={step.title}
                onChange={(e) => handleUpdateStep(idx, { title: e.target.value })}
                placeholder="Step title..."
                className="w-full font-semibold text-xs text-[#2D2926] dark:text-[#E3DFD7] bg-transparent outline-none focus:border-b border-[#A85D44] pb-0.5 mb-1"
              />

              {/* Step Description Input */}
              <textarea
                value={step.description}
                onChange={(e) => handleUpdateStep(idx, { description: e.target.value })}
                placeholder="Description / note..."
                rows={2}
                className="w-full text-[11px] text-[#757069] dark:text-[#948F86] bg-transparent outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Connection Arrow (between steps) */}
            {idx < steps.length - 1 && (
              <div className="text-stone-400 dark:text-stone-600 select-none py-1 md:py-0 shrink-0">
                <ArrowRight className="w-4 h-4 hidden md:block" />
                <span className="block md:hidden text-xs font-bold">↓</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

export const ProcessFlowExtension = Node.create({
  name: "processFlow",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: "★ Each generation hides a layer of hard work",
        parseHTML: (el) => decodeURIComponent(el.getAttribute("data-title") || ""),
        renderHTML: (attrs) => ({
          "data-title": encodeURIComponent(attrs.title || ""),
        }),
      },
      steps: {
        default: [
          { id: "1", icon: "🔌", title: "Switches & cards", description: "talk to the machine in its own code" },
          { id: "2", icon: "⌨️", title: "Programming languages", description: "write rules in near-English" },
          { id: "3", icon: "📦", title: "Ready-made blocks", description: "reuse what others wrote" },
          { id: "4", icon: "💬", title: "Plain-language requests", description: "describe it; AI writes the code", highlighted: true },
        ],
        parseHTML: (el) => safeDecode(el.getAttribute("data-steps"), []),
        renderHTML: (attrs) => ({
          "data-steps": safeEncode(attrs.steps || []),
          "data-type": "process-flow",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="process-flow"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProcessFlowComponent);
  },
});

