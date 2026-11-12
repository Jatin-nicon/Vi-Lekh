"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Pen,
  Highlighter,
  Underline as UnderlineIcon,
  Type,
  Eraser,
  Undo2,
  Trash2,
  FileDown,
  Square,
  Circle,
  MoveRight,
  Minus,
  Star,
  Cloud,
  ChevronDown,
} from "lucide-react";

export type ShapeType = "rectangle" | "circle" | "arrow" | "line" | "star" | "cloud";
export type AnnotationTool = "pen" | "highlighter" | "underline" | "text" | "eraser" | ShapeType;

export interface ShapeDefinition {
  type: ShapeType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SHAPE_DEFINITIONS: ShapeDefinition[] = [
  { type: "rectangle", label: "Rectangle", icon: Square },
  { type: "circle", label: "Circle / Ellipse", icon: Circle },
  { type: "arrow", label: "Arrow", icon: MoveRight },
  { type: "line", label: "Straight Line", icon: Minus },
  { type: "star", label: "Star (Key Note)", icon: Star },
  { type: "cloud", label: "Cloud (Idea)", icon: Cloud },
];

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
  isExporting?: boolean;
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
  isExporting = false,
  className = "",
}: AnnotationToolbarProps) {
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [activeShape, setActiveShape] = useState<ShapeType>("rectangle");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isShapeActive = SHAPE_DEFINITIONS.some((s) => s.type === tool);
  const currentShapeType: ShapeType = isShapeActive ? (tool as ShapeType) : activeShape;
  const ActiveShapeIcon = SHAPE_DEFINITIONS.find((s) => s.type === currentShapeType)?.icon || Square;

  useEffect(() => {
    if (SHAPE_DEFINITIONS.some((s) => s.type === tool)) {
      setActiveShape(tool as ShapeType);
    }
  }, [tool]);

  useEffect(() => {
    if (!isShapesOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsShapesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isShapesOpen]);

  return (
    <aside
      aria-label="Annotation controls"
      className={`print:hidden sticky top-20 z-40 max-w-fit mx-auto transition-all ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-[#FAF8F5]/90 dark:bg-[#21201E]/90 backdrop-blur-md border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.08)] text-xs text-[#2D2926] dark:text-[#E3DFD7]">
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

        {/* Tool: Shapes Dropdown Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              if (!isShapeActive) {
                onSelectTool(activeShape);
              }
              setIsShapesOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
              isShapeActive
                ? "bg-[#A85D44] text-white shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title="Geometric Shapes (Rectangle, Circle, Arrow, Line, Star, Cloud)"
            aria-expanded={isShapesOpen}
          >
            <ActiveShapeIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Shapes</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isShapesOpen ? "rotate-180" : ""}`} />
          </button>

          {isShapesOpen && (
            <div className="absolute top-full mt-2 left-0 z-50 min-w-[160px] p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-lg flex flex-col gap-0.5 animate-in fade-in-0 zoom-in-95 duration-100">
              {SHAPE_DEFINITIONS.map((def) => {
                const IconComponent = def.icon;
                const isSelected = tool === def.type;
                return (
                  <button
                    key={def.type}
                    type="button"
                    onClick={() => {
                      setActiveShape(def.type);
                      onSelectTool(def.type);
                      setIsShapesOpen(false);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-[#A85D44] text-white"
                        : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#A85D44] hover:bg-[#8F4C35] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
          title="Export Note with Annotations to PDF"
        >
          {isExporting ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <FileDown className="w-3.5 h-3.5" />
          )}
          <span>{isExporting ? "Baking PDF..." : "Save PDF"}</span>
        </button>
      </div>
    </aside>
  );
}
