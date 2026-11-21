"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MousePointer2,
  Pen,
  Highlighter,
  Underline as UnderlineIcon,
  Type,
  Eraser,
  Undo2,
  Trash2,
  FileDown,
  ChevronDown,
  Check,
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

export const PEN_STROKE_WIDTHS = [
  { label: "1.5pt", value: 1.5 },
  { label: "2.5pt", value: 2.5 },
  { label: "4.0pt", value: 4.0 },
];

export interface AnnotationToolbarProps {
  tool: AnnotationTool | null;
  onSelectTool: (tool: AnnotationTool | null) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  strokeCount: number;
  onUndo: () => void;
  onClear: () => void;
  onExportPdf: () => void;
  className?: string;
  penWidth?: number;
  onSelectPenWidth?: (width: number) => void;
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
  penWidth = 2.5,
  onSelectPenWidth,
}: AnnotationToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isPenOpen, setIsPenOpen] = useState(false);
  const penDropdownRef = useRef<HTMLDivElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  const [penCoords, setPenCoords] = useState<{ top: number; left: number } | null>(null);

  // Close pen menu on outside click or tap
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        penMenuRef.current &&
        !penMenuRef.current.contains(e.target as Node) &&
        penDropdownRef.current &&
        !penDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPenOpen(false);
      }
    };

    if (isPenOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isPenOpen]);

  // Recalculate popover position on scroll or resize
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (isPenOpen && penDropdownRef.current) {
        const rect = penDropdownRef.current.getBoundingClientRect();
        setPenCoords({
          top: rect.bottom + 6,
          left: Math.max(12, Math.min(rect.left, window.innerWidth - 170)),
        });
      }
    };

    if (isPenOpen) {
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
    }
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isPenOpen]);

  const handleTogglePenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPenOpen && penDropdownRef.current) {
      const rect = penDropdownRef.current.getBoundingClientRect();
      setPenCoords({
        top: rect.bottom + 6,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 170)),
      });
      setIsPenOpen(true);
    } else {
      setIsPenOpen(false);
    }
  };

  return (
    <aside
      aria-label="Annotation controls"
      className={`print:hidden sticky top-20 z-40 max-w-full px-2 mx-auto transition-all ${className}`}
    >
      <div className="relative max-w-fit mx-auto">
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-[#FAF8F5]/90 dark:bg-[#21201E]/90 backdrop-blur-md border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.08)] text-xs text-[#2D2926] dark:text-[#E3DFD7] overflow-x-auto no-scrollbar flex-nowrap">
          {/* Neutral Read / Cursor Mode: Allows single-finger touch scrolling and selection */}
          <button
            type="button"
            onClick={() => onSelectTool(tool === null || tool === "cursor" ? "pen" : null)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
              tool === null || tool === "cursor"
                ? "bg-[#2D2926] text-white dark:bg-[#E3DFD7] dark:text-[#21201E] shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title="Read / Cursor Mode (Scroll with touch or select text)"
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Read</span>
          </button>

          {/* Tool: Pen (Split button with chevron dropdown) */}
          <div ref={penDropdownRef} className="relative flex items-center shrink-0">
            <div
              className={`flex items-center rounded-full transition-colors ${
                tool === "pen"
                  ? "bg-[#A85D44] text-white shadow-xs"
                  : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectTool(tool === "pen" ? null : "pen")}
                className="flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 font-medium cursor-pointer"
                title="Freehand Pen"
              >
                <Pen className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Pen</span>
              </button>
              <button
                type="button"
                onClick={handleTogglePenMenu}
                className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer mr-0.5 ${
                  isPenOpen ? "bg-black/15 dark:bg-white/15" : ""
                }`}
                title="Select Pen Width"
                aria-label="Select Pen Width"
                aria-expanded={isPenOpen}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${isPenOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Tool: Highlighter */}
          <button
            type="button"
            onClick={() => onSelectTool(tool === "highlighter" ? null : "highlighter")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
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
            onClick={() => onSelectTool(tool === "underline" ? null : "underline")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
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
            onClick={() => onSelectTool(tool === "text" ? null : "text")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
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
            onClick={() => onSelectTool(tool === "eraser" ? null : "eraser")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
              tool === "eraser"
                ? "bg-[#5D7063] text-white shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title="Eraser (Click any stroke or text box to erase)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Eraser</span>
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Color Palette Swatches */}
          <div className="flex items-center gap-1 px-1 shrink-0">
            {COLOR_PALETTE.map((c) => {
              const isSelected = selectedColor === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onSelectColor(c.value)}
                  title={c.label}
                  aria-label={`Select ${c.label} color`}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer shrink-0 ${
                    isSelected ? "scale-125 ring-2 ring-offset-1 ring-stone-400 dark:ring-stone-500" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              );
            })}
          </div>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Undo Stroke */}
          <button
            type="button"
            onClick={onUndo}
            disabled={strokeCount === 0}
            className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
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
            className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Clear all annotations"
            aria-label="Clear all annotations"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Export Annotated PDF */}
          <button
            type="button"
            onClick={onExportPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#A85D44] hover:bg-[#8F4C35] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            title="Export Note with Annotations to PDF"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Save PDF</span>
          </button>
        </div>
        <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 rounded-r-full bg-gradient-to-l from-[#FAF8F5] dark:from-[#21201E] to-transparent opacity-80" />
      </div>

      {/* Portaled Pen Width Popover (escapes overflow-x-auto) */}
      {mounted && isPenOpen && penCoords && createPortal(
        <div
          ref={penMenuRef}
          style={{
            position: "fixed",
            top: `${penCoords.top}px`,
            left: `${penCoords.left}px`,
            zIndex: 9999,
          }}
          className="min-w-[155px] p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl flex flex-col gap-0.5 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
            Pen Width
          </div>
          {PEN_STROKE_WIDTHS.map((pw) => {
            const isSelected = (penWidth || 2.5) === pw.value;
            return (
              <button
                key={pw.value}
                type="button"
                onClick={() => {
                  onSelectPenWidth?.(pw.value);
                  onSelectTool("pen");
                  setIsPenOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#A85D44] text-white"
                    : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="rounded-full bg-current shrink-0"
                    style={{
                      width: `${Math.max(3, pw.value * 2)}px`,
                      height: `${Math.max(3, pw.value * 2)}px`,
                    }}
                  />
                  <span>
                    {pw.label === "1.5pt"
                      ? "Thin (1.5pt)"
                      : pw.label === "2.5pt"
                      ? "Medium (2.5pt)"
                      : "Thick (4.0pt)"}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </aside>
  );
}
