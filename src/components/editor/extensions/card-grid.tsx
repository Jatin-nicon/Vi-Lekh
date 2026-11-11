"use client";

import React from "react";
import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Plus, Trash2, LayoutGrid } from "lucide-react";

export type CardAccent = "neutral" | "pitfall" | "solution" | "dashed";

export interface ConceptCard {
  id: string;
  icon: string;
  title: string;
  accent: CardAccent;
  content: string;
  fix?: string;
  inOtherWords?: string;
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

function CardGridComponent({ node, updateAttributes }: NodeViewProps) {
  const cards: ConceptCard[] = (node.attrs.cards as ConceptCard[]) || [
    {
      id: "c1",
      icon: "🤷",
      title: "Too vague",
      accent: "pitfall",
      content: '"Make it nice." Nice to whom?',
      fix: "Fix: name one thing you can see or test.",
      inOtherWords: "Leave no room for guessing.",
    },
    {
      id: "c2",
      icon: "🧳",
      title: "Too much at once",
      accent: "pitfall",
      content: "Ten features in one message; three get done well.",
      fix: "Fix: one feature per round.",
      inOtherWords: "Work in small verifiable steps.",
    },
  ];

  const handleUpdateCard = (index: number, partial: Partial<ConceptCard>) => {
    const updated = cards.map((c, i) => (i === index ? { ...c, ...partial } : c));
    updateAttributes({ cards: updated });
  };

  const handleAddCard = () => {
    const newCard: ConceptCard = {
      id: "card_" + Math.random().toString(36).slice(2, 7),
      icon: "💡",
      title: "New Concept / Note",
      accent: "neutral",
      content: "Core idea or misconception...",
      fix: "Fix or recommendation...",
      inOtherWords: "In other words: plain takeaway.",
    };
    updateAttributes({ cards: [...cards, newCard] });
  };

  const handleRemoveCard = (index: number) => {
    if (cards.length <= 1) return;
    const updated = cards.filter((_, i) => i !== index);
    updateAttributes({ cards: updated });
  };

  const getAccentBorder = (accent: CardAccent) => {
    switch (accent) {
      case "pitfall":
        return "border-l-4 border-l-rose-500 border-t border-r border-b border-[#E8E3D9] dark:border-[#33312E]";
      case "solution":
        return "border-l-4 border-l-emerald-600 border-t border-r border-b border-[#E8E3D9] dark:border-[#33312E]";
      case "dashed":
        return "border-2 border-dashed border-[#D5CEBF] dark:border-[#45423E]";
      default:
        return "border border-[#E8E3D9] dark:border-[#33312E]";
    }
  };

  return (
    <NodeViewWrapper className="my-6 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] p-5 shadow-sm transition-all">
      {/* Header with Add Card Control */}
      <div className="flex items-center justify-between mb-4 select-none pb-2 border-b border-[#E8E3D9]/60 dark:border-[#33312E]" contentEditable={false}>
        <div className="flex items-center gap-2 text-xs font-bold text-[#A85D44] dark:text-[#C4785E]">
          <LayoutGrid className="w-4 h-4" />
          <span>CONCEPT & ANTIPATTERN CARDS</span>
        </div>
        <button
          type="button"
          onClick={handleAddCard}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#33312E] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Card</span>
        </button>
      </div>

      {/* 2-Column Responsive Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, idx) => (
          <div
            key={card.id || idx}
            className={`rounded-xl p-4 bg-white dark:bg-[#242220] transition-all ${getAccentBorder(card.accent)}`}
          >
            {/* Card Controls Header */}
            <div className="flex items-center justify-between gap-2 mb-2 select-none" contentEditable={false}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={card.icon}
                  onChange={(e) => handleUpdateCard(idx, { icon: e.target.value })}
                  className="w-7 h-7 text-center text-sm rounded bg-[#FAF8F5] dark:bg-[#1E1C1B] border border-[#E8E3D9] dark:border-[#33312E] outline-none"
                  title="Card icon / emoji"
                />
                <select
                  value={card.accent}
                  onChange={(e) => handleUpdateCard(idx, { accent: e.target.value as CardAccent })}
                  className="text-[11px] bg-[#FAF8F5] dark:bg-[#1E1C1B] border border-[#E8E3D9] dark:border-[#33312E] rounded px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  <option value="neutral">Neutral</option>
                  <option value="pitfall">Pitfall / Mistake (Red)</option>
                  <option value="solution">Solution / Fix (Green)</option>
                  <option value="dashed">Exercise / Fill-in</option>
                </select>
              </div>

              {cards.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCard(idx)}
                  className="p-1 rounded text-[#757069] hover:text-red-600 transition-colors"
                  title="Remove card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Card Title */}
            <input
              type="text"
              value={card.title}
              onChange={(e) => handleUpdateCard(idx, { title: e.target.value })}
              placeholder="Card title..."
              className="w-full font-bold text-xs uppercase tracking-wide text-[#2D2926] dark:text-[#E3DFD7] bg-transparent outline-none mb-1.5 focus:border-b border-[#A85D44]"
            />

            {/* Card Body */}
            <textarea
              value={card.content}
              onChange={(e) => handleUpdateCard(idx, { content: e.target.value })}
              placeholder="Card observation / quote..."
              rows={2}
              className="w-full text-xs text-[#2D2926] dark:text-[#E3DFD7] bg-transparent outline-none resize-none leading-relaxed mb-1.5"
            />

            {/* Card Fix / Prescription */}
            <input
              type="text"
              value={card.fix || ""}
              onChange={(e) => handleUpdateCard(idx, { fix: e.target.value })}
              placeholder="Fix: action or guideline..."
              className="w-full text-xs font-medium text-[#5D7063] dark:text-[#768D7D] bg-transparent outline-none mb-1.5"
            />

            {/* In Other Words footer */}
            <input
              type="text"
              value={card.inOtherWords || ""}
              onChange={(e) => handleUpdateCard(idx, { inOtherWords: e.target.value })}
              placeholder="In other words: plain summary..."
              className="w-full text-[11px] italic text-[#757069] dark:text-[#948F86] bg-transparent outline-none border-t border-[#E8E3D9]/60 dark:border-[#33312E] pt-1.5"
            />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

export const CardGridExtension = Node.create({
  name: "cardGrid",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      cards: {
        default: [
          {
            id: "c1",
            icon: "🤷",
            title: "Too vague",
            accent: "pitfall",
            content: '"Make it nice." Nice to whom?',
            fix: "Fix: name one thing you can see or test.",
            inOtherWords: "Leave no room for guessing.",
          },
          {
            id: "c2",
            icon: "🧳",
            title: "Too much at once",
            accent: "pitfall",
            content: "Ten features in one message; three get done well.",
            fix: "Fix: one feature per round.",
            inOtherWords: "Work in small verifiable steps.",
          },
        ],
        parseHTML: (el) => safeDecode(el.getAttribute("data-cards"), []),
        renderHTML: (attrs) => ({
          "data-cards": safeEncode(attrs.cards || []),
          "data-type": "card-grid",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="card-grid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardGridComponent);
  },
});

