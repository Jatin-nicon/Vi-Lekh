"use client";

import React, { useState, useRef, useEffect } from "react";
import type { NoteBlock } from "@/lib/supabase/types";
import { MathRenderer } from "./math-renderer";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Code, 
  Sigma, 
  Info, 
  Heading1, 
  Heading2, 
  Heading3, 
  Type, 
  List, 
  ChevronDown,
  Sparkles
} from "lucide-react";

interface BlockEditorProps {
  initialBlocks?: NoteBlock[];
  onChange?: (blocks: NoteBlock[]) => void;
  readOnly?: boolean;
}

export function BlockEditor({ initialBlocks, onChange, readOnly = false }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<NoteBlock[]>(
    initialBlocks && initialBlocks.length > 0
      ? initialBlocks
      : [
          {
            id: "b1",
            type: "heading",
            content: "Introduction to Cross-Entropy Loss",
            props: { level: 1 },
          },
          {
            id: "b2",
            type: "paragraph",
            content:
              "In classification tasks, cross-entropy measures the divergence between the true probability distribution and the model predictions.",
          },
          {
            id: "b3",
            type: "math",
            content: "L_{CE}(y, \\hat{y}) = - \\sum_{i=1}^{C} y_i \\log(\\hat{y}_i)",
          },
          {
            id: "b4",
            type: "callout",
            content: "Cross-entropy loss is strictly convex for logistic regression, guaranteeing a global minimum.",
            props: { calloutType: "tip" },
          },
          {
            id: "b5",
            type: "code",
            content: "import torch\nimport torch.nn as nn\n\nloss_fn = nn.CrossEntropyLoss()\nloss = loss_fn(predictions, targets)",
            props: { language: "python" },
          },
        ]
  );

  const [activeSlashIndex, setActiveSlashIndex] = useState<number | null>(null);
  const [slashSearch, setSlashSearch] = useState("");
  const slashMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onChange) {
      onChange(blocks);
    }
  }, [blocks, onChange]);

  // Handle clicking outside slash menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (slashMenuRef.current && !slashMenuRef.current.contains(event.target as Node)) {
        setActiveSlashIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateBlockContent = (index: number, content: string) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], content };
    setBlocks(updated);

    // Detect slash command
    if (content.endsWith("/") || content === "/") {
      setActiveSlashIndex(index);
      setSlashSearch("");
    } else if (activeSlashIndex === index && content.includes("/")) {
      const match = content.split("/").pop() || "";
      setSlashSearch(match);
    } else {
      setActiveSlashIndex(null);
    }
  };

  const updateBlockProps = (index: number, props: Record<string, unknown>) => {
    const updated = [...blocks];
    updated[index] = {
      ...updated[index],
      props: { ...updated[index].props, ...props },
    };
    setBlocks(updated);
  };

  const convertBlockType = (index: number, newType: NoteBlock["type"], extraProps = {}) => {
    const updated = [...blocks];
    let cleanedContent = updated[index].content;
    if (cleanedContent.includes("/")) {
      cleanedContent = cleanedContent.replace(/\/.*$/, "").trim();
    }
    updated[index] = {
      ...updated[index],
      type: newType,
      content: cleanedContent || (newType === "math" ? "\\sum_{i=1}^n x_i" : ""),
      props: { ...extraProps },
    };
    setBlocks(updated);
    setActiveSlashIndex(null);
  };

  const insertBlockAfter = (index: number, type: NoteBlock["type"] = "paragraph") => {
    const newBlock: NoteBlock = {
      id: "b_" + Math.random().toString(36).substring(2, 9),
      type,
      content: "",
      props: type === "heading" ? { level: 2 } : type === "code" ? { language: "python" } : undefined,
    };
    const updated = [...blocks];
    updated.splice(index + 1, 0, newBlock);
    setBlocks(updated);
  };

  const removeBlock = (index: number) => {
    if (blocks.length <= 1) return;
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
  };

  const slashOptions = [
    { label: "Text", desc: "Just start typing plain text", icon: Type, type: "paragraph" as const },
    { label: "Heading 1", desc: "Large section heading", icon: Heading1, type: "heading" as const, props: { level: 1 } },
    { label: "Heading 2", desc: "Medium section heading", icon: Heading2, type: "heading" as const, props: { level: 2 } },
    { label: "Heading 3", desc: "Small section heading", icon: Heading3, type: "heading" as const, props: { level: 3 } },
    { label: "Math Equation", desc: "KaTeX mathematical equation", icon: Sigma, type: "math" as const },
    { label: "Code Snippet", desc: "Code block with syntax highlighting", icon: Code, type: "code" as const, props: { language: "python" } },
    { label: "Callout / Tip", desc: "Highlight an important tip or note", icon: Info, type: "callout" as const, props: { calloutType: "tip" } },
    { label: "Bulleted List", desc: "Create a simple bulleted list", icon: List, type: "bullet_list" as const },
  ];

  const filteredOptions = slashOptions.filter(
    (opt) => opt.label.toLowerCase().includes(slashSearch.toLowerCase()) || opt.type.includes(slashSearch.toLowerCase())
  );

  return (
    <div className="relative max-w-4xl mx-auto w-full py-6 px-4 sm:px-8">
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div key={block.id} className="group relative flex items-start -ml-12 pl-12 transition-all">
            {/* Block Hover Controls */}
            {!readOnly && (
              <div className="absolute left-0 top-1 opacity-0 group-hover:opacity-100 flex items-center space-x-0.5 text-stone-400 hover:text-stone-600 transition-opacity">
                <button
                  type="button"
                  title="Add block below"
                  onClick={() => insertBlockAfter(index)}
                  className="p-1 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Block options"
                  onClick={() => removeBlock(index)}
                  className="p-1 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded transition-colors text-rose-500/80 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="cursor-grab p-1 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded">
                  <GripVertical className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Block Content by Type */}
            <div className="flex-1 min-w-0">
              {block.type === "heading" && (
                <div>
                  {block.props?.level === 1 ? (
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content}
                      onChange={(e) => updateBlockContent(index, e.target.value)}
                      placeholder="Heading 1..."
                      className="w-full text-2xl sm:text-3xl font-bold tracking-tight bg-transparent border-none outline-none text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 py-1"
                    />
                  ) : block.props?.level === 2 ? (
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content}
                      onChange={(e) => updateBlockContent(index, e.target.value)}
                      placeholder="Heading 2..."
                      className="w-full text-xl sm:text-2xl font-semibold tracking-tight bg-transparent border-none outline-none text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600 py-1"
                    />
                  ) : (
                    <input
                      type="text"
                      disabled={readOnly}
                      value={block.content}
                      onChange={(e) => updateBlockContent(index, e.target.value)}
                      placeholder="Heading 3..."
                      className="w-full text-lg sm:text-xl font-medium tracking-tight bg-transparent border-none outline-none text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600 py-0.5"
                    />
                  )}
                </div>
              )}

              {block.type === "paragraph" && (
                <textarea
                  disabled={readOnly}
                  rows={Math.max(1, Math.ceil(block.content.length / 80))}
                  value={block.content}
                  onChange={(e) => updateBlockContent(index, e.target.value)}
                  placeholder="Type '/' for commands..."
                  className="w-full bg-transparent border-none outline-none resize-none leading-relaxed text-stone-700 dark:text-stone-300 placeholder:text-stone-400/60 dark:placeholder:text-stone-600 py-1"
                />
              )}

              {block.type === "math" && (
                <div className="my-2 p-3.5 rounded-xl border border-[#E8E3D9] dark:border-[#383530] bg-[#F7F4EB] dark:bg-[#22201D]">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#E8E3D9]/60 dark:border-[#383530]/60">
                    <span className="text-xs font-medium uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E] flex items-center gap-1.5">
                      <Sigma className="w-3.5 h-3.5" /> KaTeX Equation
                    </span>
                    {!readOnly && (
                      <span className="text-xs text-[#757069] dark:text-[#948F86]">LaTeX Formula</span>
                    )}
                  </div>
                  {!readOnly ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => updateBlockContent(index, e.target.value)}
                        placeholder="e.g. \\sum_{i=1}^N x_i"
                        className="w-full font-mono text-xs p-2 rounded-lg bg-[#FAF8F5] dark:bg-[#181716] border border-[#E8E3D9] dark:border-[#33312E] text-[#2D2926] dark:text-[#E3DFD7] outline-none focus:border-[#A85D44]"
                      />
                      <div className="p-3 text-center overflow-x-auto">
                        <MathRenderer latex={block.content || "\\text{Empty equation}"} displayMode />
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 text-center overflow-x-auto">
                      <MathRenderer latex={block.content} displayMode />
                    </div>
                  )}
                </div>
              )}

              {block.type === "code" && (
                <div className="my-2 rounded-xl border border-[#3A3632] bg-[#252321] text-[#E8DCC4] overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#1E1C1A] text-xs text-[#9E9689] border-b border-[#3A3632]">
                    <div className="flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-[#C4785E]" />
                      <span className="capitalize">{block.props?.language || "python"}</span>
                    </div>
                    {!readOnly && (
                      <select
                        value={block.props?.language || "python"}
                        onChange={(e) => updateBlockProps(index, { language: e.target.value })}
                        className="bg-[#252321] border border-[#3A3632] text-[#D4C3A3] rounded px-1.5 py-0.5 text-xs outline-none"
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="typescript">TypeScript</option>
                        <option value="bash">Bash / Shell</option>
                      </select>
                    )}
                  </div>
                  <textarea
                    disabled={readOnly}
                    rows={Math.max(3, block.content.split("\n").length)}
                    value={block.content}
                    onChange={(e) => updateBlockContent(index, e.target.value)}
                    placeholder="Write code here..."
                    className="w-full p-3 font-mono text-xs leading-relaxed bg-transparent border-none outline-none resize-none text-[#D4C3A3] selection:bg-[#3A3632]"
                  />
                </div>
              )}

              {block.type === "callout" && (
                <div className="my-2 p-3.5 rounded-xl border border-[#E8E3D9] dark:border-[#383530] bg-[#F7F4EB] dark:bg-[#22201D] flex gap-3 text-sm text-[#2D2926] dark:text-[#E3DFD7]">
                  <div className="mt-0.5 text-[#A85D44] dark:text-[#C4785E]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <textarea
                    disabled={readOnly}
                    rows={Math.max(1, Math.ceil(block.content.length / 70))}
                    value={block.content}
                    onChange={(e) => updateBlockContent(index, e.target.value)}
                    placeholder="Callout text..."
                    className="w-full bg-transparent border-none outline-none resize-none leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]"
                  />
                </div>
              )}

              {block.type === "bullet_list" && (
                <div className="flex items-start gap-2 py-0.5">
                  <span className="text-[#A85D44] dark:text-[#C4785E] font-bold mt-1">•</span>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={block.content}
                    onChange={(e) => updateBlockContent(index, e.target.value)}
                    placeholder="List item..."
                    className="w-full bg-transparent border-none outline-none text-[#2D2926] dark:text-[#E3DFD7]"
                  />
                </div>
              )}

              {/* Slash Command Dropdown Menu */}
              {activeSlashIndex === index && !readOnly && (
                <div
                  ref={slashMenuRef}
                  className="absolute z-50 left-12 mt-1 w-64 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] shadow-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-[#757069] dark:text-[#948F86]">
                    Insert Block
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => convertBlockType(index, opt.type, opt.props)}
                            className="w-full text-left px-3 py-1.5 flex items-center gap-2.5 hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
                          >
                            <div className="p-1 rounded bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#2D2926] dark:text-[#E3DFD7]">
                              <Icon className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-[#2D2926] dark:text-[#E3DFD7]">
                                {opt.label}
                              </div>
                              <div className="text-[10px] text-[#757069] dark:text-[#948F86]">
                                {opt.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-stone-400">
                        No matching blocks
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

