"use client";

import React from "react";
import {
  MousePointer,
  Pen,
  Highlighter,
  Underline as UnderlineIcon,
  Type,
  Eraser,
  Undo2,
  Trash2,
  FileDown,
} from "lucide-react";

export type AnnotationTool = "cursor" | "pen" | "highlighter" | "underline" | "text" | "eraser";

export interface ColorOption {
  label: string;
  value: string;
  highlighterValue: string;
}

export const COLOR_PALETTE: ColorOption[] = [
  { label: "Terracotta", value: "#A85D44", highlighterValue: "rgba(168, 93, 68, 0.35)" },
  { label: "Ink", value: "#2D2926", highlighterValue: "rgba(45, 41, 38, 0.25)" },
  { label: "Amber Gold", value: "#D97706", highlighterValue: "rgba(245, 158, 11, 0.45)" },
  { label: "Emerald", value: "#059669", highlighterValue: "rgba(16, 185, 129, 0.35)" },
  { label: "Azure", value: "#2563EB", highlighterValue: "rgba(59, 130, 246, 0.35)" },
];

interface AnnotationToolbarProps {
  tool: AnnotationTool;
  onSelectTool: (tool: AnnotationTool) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  strokeCount: number;
  onUndo: () => void;
  onClear: () => void;
  onExportPdf: () => void;
  className?: string;
}

export function AnnotationToolbar({
  tool,
  onSelectTool,
  selectedColor,
  onSelectColor,
  strokeCount,
  onUndo,
  onClear,
  onExportPdf,
  className = "",
}: AnnotationToolbarProps) {
  return (
    <aside
      aria-label="Annotation controls"
      className={`print:hidden sticky top-20 z-40 max-w-fit mx-auto transition-all ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-[#FAF8F5]/90 dark:bg-[#21201E]/90 backdrop-blur-md border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.08)] text-xs text-[#2D2926] dark:text-[#E3DFD7]">
        {/* Tool: Cursor / Pointer */}
        <button
          type="button"
          onClick={() => onSelectTool("cursor")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
            tool === "cursor"
              ? "bg-[#2D2926] text-white dark:bg-[#E3DFD7] dark:text-[#21201E] shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title="Cursor (Select text & normal reading)"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Select</span>
        </button>

        {/* Tool: Pen */}
        <button
          type="button"
          onClick={() => onSelectTool("pen")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
            tool === "pen"
              ? "bg-[#A85D44] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title="Freehand Pen"
        >
          <Pen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Pen</span>
        </button>

        {/* Tool: Highlighter */}
        <button
          type="button"
          onClick={() => onSelectTool("highlighter")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
            tool === "highlighter"
              ? "bg-[#D97706] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title="Text Highlighter"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Highlight</span>
        </button>

        {/* Tool: Underline */}
        <button
          type="button"
          onClick={() => onSelectTool("underline")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
            tool === "underline"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title="Underline Tool"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Underline</span>
        </button>

        {/* Tool: Text Box */}
        <button
          type="button"
          onClick={() => onSelectTool("text")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
            tool === "text"
              ? "bg-[#A85D44] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title="Type Text Box (Click anywhere on note to type)"
        >
          <Type className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Text</span>
        </button>

        {/* Tool: Eraser */}
        <button
          type="button"
          onClick={() => onSelectTool("eraser")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
            tool === "eraser"
              ? "bg-[#5D7063] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title="Eraser (Click any stroke or text box to erase)"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Eraser</span>
        </button>

        <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

        {/* Color Palette Swatches */}
        <div className="flex items-center gap-1 px-1">
          {COLOR_PALETTE.map((c) => {
            const isSelected = selectedColor === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onSelectColor(c.value)}
                title={c.label}
                aria-label={`Select ${c.label} color`}
                className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                  isSelected ? "scale-125 ring-2 ring-offset-1 ring-stone-400 dark:ring-stone-500" : "hover:scale-110"
                }`}
                style={{ backgroundColor: c.value }}
              />
            );
          })}
        </div>

        <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

        {/* Undo Stroke */}
        <button
          type="button"
          onClick={onUndo}
          disabled={strokeCount === 0}
          className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
          aria-label="Undo last annotation"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        {/* Clear All Strokes */}
        <button
          type="button"
          onClick={onClear}
          disabled={strokeCount === 0}
          className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Clear all annotations"
          aria-label="Clear all annotations"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

        {/* Export Annotated PDF */}
        <button
          type="button"
          onClick={onExportPdf}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#A85D44] hover:bg-[#8F4C35] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
          title="Export Note with Annotations to PDF"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Save PDF</span>
        </button>
      </div>
    </aside>
  );
}
