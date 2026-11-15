"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  MousePointer2,
  Pen,
  Highlighter,
  Underline as UnderlineIcon,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  FileDown,
  Square,
  Circle,
  MoveRight,
  Minus,
  Star,
  Cloud,
  ChevronDown,
  Bold,
  Italic,
  Check,
} from "lucide-react";
import type { AnnotationShape, AnnotationTextBox } from "./annotation-layer";

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

export const PEN_STROKE_WIDTHS = [
  { label: "1.5pt", value: 1.5 },
  { label: "2.5pt", value: 2.5 },
  { label: "4.0pt", value: 4.0 },
];

export const SHAPE_STROKE_WIDTHS = [
  { label: "1.5pt", value: 1.5 },
  { label: "2.5pt", value: 2.5 },
  { label: "4.0pt", value: 4.0 },
];

export const SHAPE_FILL_OPACITIES = [
  { label: "0%", value: 0.0, title: "0% (Outline)" },
  { label: "20%", value: 0.2, title: "20% (Soft Tint)" },
  { label: "50%", value: 0.5, title: "50% (Medium)" },
  { label: "100%", value: 1.0, title: "100% (Solid)" },
];

export const TEXT_FONT_SIZES = [12, 14, 18, 24];

export interface AnnotationToolbarProps {
  tool: AnnotationTool | null;
  onSelectTool: (tool: AnnotationTool | null) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
  strokeCount: number;
  onUndo: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  onClear: () => void;
  onExportPdf: () => void;
  isExporting?: boolean;
  className?: string;

  // Pen width state
  penWidth?: number;
  onSelectPenWidth?: (width: number) => void;

  // Active Text Box editing mode
  activeTextBox?: AnnotationTextBox | null;
  onUpdateActiveTextBox?: (updates: Partial<AnnotationTextBox>) => void;
  onDeleteActiveTextBox?: () => void;
  onDeselectTextBox?: () => void;

  // Active Shape editing mode
  activeShape?: AnnotationShape | null;
  onUpdateActiveShape?: (updates: Partial<AnnotationShape>) => void;
  onDeleteActiveShape?: () => void;
  onDeselectShape?: () => void;

  // Shape default styling states
  shapeWidth?: number;
  onSelectShapeWidth?: (width: number) => void;
  shapeFillOpacity?: number;
  onSelectShapeFillOpacity?: (opacity: number) => void;
}

export function AnnotationToolbar({
  tool,
  onSelectTool,
  selectedColor,
  onSelectColor,
  strokeCount,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onClear,
  onExportPdf,
  isExporting = false,
  className = "",
  penWidth = 2.5,
  onSelectPenWidth,
  activeTextBox,
  onUpdateActiveTextBox,
  onDeleteActiveTextBox,
  onDeselectTextBox,
  activeShape,
  onUpdateActiveShape,
  onDeleteActiveShape,
  onDeselectShape,
  shapeWidth = 2.0,
  onSelectShapeWidth,
  shapeFillOpacity = 0.0,
  onSelectShapeFillOpacity,
}: AnnotationToolbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [activeShapeType, setActiveShapeType] = useState<ShapeType>("rectangle");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shapesMenuRef = useRef<HTMLDivElement>(null);
  const [shapesCoords, setShapesCoords] = useState<{ top: number; left: number } | null>(null);

  const [isPenOpen, setIsPenOpen] = useState(false);
  const penDropdownRef = useRef<HTMLDivElement>(null);
  const penMenuRef = useRef<HTMLDivElement>(null);
  const [penCoords, setPenCoords] = useState<{ top: number; left: number } | null>(null);

  const isShapeActive = SHAPE_DEFINITIONS.some((s) => s.type === tool);
  const currentShapeType: ShapeType = isShapeActive ? (tool as ShapeType) : activeShapeType;
  const ActiveShapeIcon = SHAPE_DEFINITIONS.find((s) => s.type === currentShapeType)?.icon || Square;

  useEffect(() => {
    if (SHAPE_DEFINITIONS.some((s) => s.type === tool)) {
      setActiveShapeType(tool as ShapeType);
    }
  }, [tool]);

  const updatePenPosition = useCallback(() => {
    if (penDropdownRef.current && typeof window !== "undefined") {
      const rect = penDropdownRef.current.getBoundingClientRect();
      const popoverWidth = 155;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));
      setPenCoords({
        top: rect.bottom + 6,
        left,
      });
    }
  }, []);

  const togglePenDropdown = useCallback(() => {
    setIsShapesOpen(false);
    if (tool !== "pen") {
      onSelectTool("pen");
    }
    setIsPenOpen((prev) => {
      if (!prev) {
        updatePenPosition();
        return true;
      }
      return false;
    });
  }, [tool, onSelectTool, updatePenPosition]);

  const updateShapesPosition = useCallback(() => {
    if (dropdownRef.current && typeof window !== "undefined") {
      const rect = dropdownRef.current.getBoundingClientRect();
      const popoverWidth = 175;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));
      setShapesCoords({
        top: rect.bottom + 6,
        left,
      });
    }
  }, []);

  const toggleShapesDropdown = useCallback(() => {
    setIsPenOpen(false);
    if (!isShapeActive) {
      onSelectTool(activeShapeType);
    }
    setIsShapesOpen((prev) => {
      if (!prev) {
        updateShapesPosition();
        return true;
      }
      return false;
    });
  }, [isShapeActive, activeShapeType, onSelectTool, updateShapesPosition]);

  useEffect(() => {
    if (!isShapesOpen && !isPenOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        isShapesOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        shapesMenuRef.current &&
        !shapesMenuRef.current.contains(target)
      ) {
        setIsShapesOpen(false);
      }
      if (
        isPenOpen &&
        penDropdownRef.current &&
        !penDropdownRef.current.contains(target) &&
        penMenuRef.current &&
        !penMenuRef.current.contains(target)
      ) {
        setIsPenOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsShapesOpen(false);
      setIsPenOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isShapesOpen, isPenOpen]);

  // Mode 1: Contextual Text Box Styling Mode
  if (activeTextBox) {
    return (
      <aside
        aria-label="Text formatting controls"
        className={`print:hidden sticky top-16 z-20 max-w-[calc(100vw-1.5rem)] sm:max-w-fit mx-auto pt-2 transition-all ${className}`}
      >
        <div className="relative">
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.12)] text-xs text-[#2D2926] dark:text-[#E3DFD7] overflow-x-auto no-scrollbar flex-nowrap">
          {/* Done editing text */}
          <button
            type="button"
            onClick={onDeselectTextBox}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-[#2D2926] dark:text-[#E3DFD7] font-medium transition-colors cursor-pointer shrink-0"
            title="Done editing text"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Done</span>
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Bold toggle */}
          <button
            type="button"
            onClick={() => onUpdateActiveTextBox?.({ bold: !activeTextBox.bold })}
            className={`p-1.5 rounded-full font-bold transition-colors cursor-pointer shrink-0 ${
              activeTextBox.bold
                ? "bg-[#A85D44] text-white shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic toggle */}
          <button
            type="button"
            onClick={() => onUpdateActiveTextBox?.({ italic: !activeTextBox.italic })}
            className={`p-1.5 rounded-full italic transition-colors cursor-pointer shrink-0 ${
              activeTextBox.italic
                ? "bg-[#A85D44] text-white shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Border outline toggle */}
          <button
            type="button"
            onClick={() => onUpdateActiveTextBox?.({ hasBorder: !activeTextBox.hasBorder })}
            className={`p-1.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              activeTextBox.hasBorder
                ? "bg-[#A85D44] text-white shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title={activeTextBox.hasBorder ? "Border outline enabled (click to remove)" : "Border outline disabled (click to add)"}
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Font size selector */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-[#757069] dark:text-[#948F86] font-medium hidden sm:inline">Size:</span>
            {TEXT_FONT_SIZES.map((sz) => {
              const isSelected = (activeTextBox.fontSize || 14) === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onUpdateActiveTextBox?.({ fontSize: sz })}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#2563EB] text-white font-semibold"
                      : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
                  }`}
                  title={`Font Size ${sz}pt`}
                >
                  {sz}
                </button>
              );
            })}
          </div>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Color palette */}
          <div className="flex items-center gap-1 px-1 shrink-0">
            {COLOR_PALETTE.map((c) => {
              const isSelected = activeTextBox.color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    onUpdateActiveTextBox?.({ color: c.value });
                    onSelectColor(c.value);
                  }}
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

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Delete text box */}
          <button
            type="button"
            onClick={onDeleteActiveTextBox}
            className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
            title="Delete text box"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 rounded-r-full bg-gradient-to-l from-[#FAF8F5] dark:from-[#21201E] to-transparent opacity-80" />
      </div>
    </aside>
  );
}

  // Mode 2: Contextual Shape Styling Mode
  if (activeShape) {
    return (
      <aside
        aria-label="Shape styling controls"
        className={`print:hidden sticky top-16 z-20 max-w-[calc(100vw-1.5rem)] sm:max-w-fit mx-auto pt-2 transition-all ${className}`}
      >
        <div className="relative">
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.12)] text-xs text-[#2D2926] dark:text-[#E3DFD7] overflow-x-auto no-scrollbar flex-nowrap">
          {/* Done with shape */}
          <button
            type="button"
            onClick={onDeselectShape}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-[#2D2926] dark:text-[#E3DFD7] font-medium transition-colors cursor-pointer shrink-0"
            title="Done editing shape"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Done</span>
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Stroke Width pills */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-[#757069] dark:text-[#948F86] font-medium hidden sm:inline">Stroke:</span>
            {SHAPE_STROKE_WIDTHS.map((sw) => {
              const isSelected = (activeShape.width || 2) === sw.value;
              return (
                <button
                  key={sw.value}
                  type="button"
                  onClick={() => onUpdateActiveShape?.({ width: sw.value })}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#A85D44] text-white font-semibold"
                      : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
                  }`}
                >
                  {sw.label}
                </button>
              );
            })}
          </div>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Fill Opacity pills */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-[#757069] dark:text-[#948F86] font-medium hidden sm:inline">Fill:</span>
            {SHAPE_FILL_OPACITIES.map((fo) => {
              const isSelected = (activeShape.fillOpacity ?? 0) === fo.value;
              return (
                <button
                  key={fo.value}
                  type="button"
                  onClick={() => onUpdateActiveShape?.({ fillOpacity: fo.value })}
                  title={fo.title}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#2563EB] text-white font-semibold"
                      : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
                  }`}
                >
                  {fo.label}
                </button>
              );
            })}
          </div>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Color palette */}
          <div className="flex items-center gap-1 px-1 shrink-0">
            {COLOR_PALETTE.map((c) => {
              const isSelected = activeShape.color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    onUpdateActiveShape?.({ color: c.value });
                    onSelectColor(c.value);
                  }}
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

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1 shrink-0" />

          {/* Delete shape */}
          <button
            type="button"
            onClick={onDeleteActiveShape}
            className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer shrink-0"
            title="Delete shape"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 rounded-r-full bg-gradient-to-l from-[#FAF8F5] dark:from-[#21201E] to-transparent opacity-80" />
      </div>
    </aside>
  );
}

  // Mode 3: Default Drawing Mode
  return (
    <aside
      aria-label="Annotation controls"
      className={`print:hidden sticky top-16 z-20 max-w-[calc(100vw-1.5rem)] sm:max-w-fit mx-auto pt-2 transition-all ${className}`}
    >
      <div className="relative">
        <div
          onScroll={() => {
            if (isShapesOpen) setIsShapesOpen(false);
            if (isPenOpen) setIsPenOpen(false);
          }}
          className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.12)] text-xs text-[#2D2926] dark:text-[#E3DFD7] overflow-x-auto no-scrollbar flex-nowrap"
        >
        {/* Tool: Read / Cursor Mode (Neutral - Scroll & Pinch-Zoom without drawing) */}
        <button
          type="button"
          onClick={() => onSelectTool(null)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
            tool === null
              ? "bg-[#2D2926] dark:bg-[#FAF8F5] text-white dark:text-[#21201E] shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title="Read Mode (Scroll & Pinch-Zoom without drawing)"
          aria-label="Read and scroll mode"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Read</span>
        </button>

        {/* Tool: Pen with Dropdown */}
        <div
          ref={penDropdownRef}
          className={`relative shrink-0 flex items-center rounded-full transition-colors ${
            tool === "pen"
              ? "bg-[#A85D44] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (tool === "pen") {
                onSelectTool(null);
                setIsPenOpen(false);
              } else {
                onSelectTool("pen");
              }
            }}
            className="flex items-center gap-1 pl-2.5 pr-1 py-1.5 rounded-l-full font-medium cursor-pointer"
            title={tool === "pen" ? "Pen active (click to deselect)" : "Freehand Pen"}
          >
            <Pen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pen</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePenDropdown();
            }}
            className={`p-1.5 pr-2.5 rounded-r-full cursor-pointer flex items-center justify-center transition-colors min-w-[26px] min-h-[30px] ${
              tool === "pen"
                ? "hover:bg-black/15 text-white"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            }`}
            title="Pen width options"
            aria-label="Pen width options"
            aria-expanded={isPenOpen}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isPenOpen ? "rotate-180" : ""}`} />
          </button>
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
          title={tool === "highlighter" ? "Highlighter active (click to deselect)" : "Text Highlighter"}
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
          title={tool === "underline" ? "Underline active (click to deselect)" : "Underline Tool"}
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Underline</span>
        </button>

        {/* Tool: Shapes with Dropdown */}
        <div
          ref={dropdownRef}
          className={`relative shrink-0 flex items-center rounded-full transition-colors ${
            isShapeActive
              ? "bg-[#A85D44] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (isShapeActive) {
                onSelectTool(null);
                setIsShapesOpen(false);
              } else {
                onSelectTool(activeShapeType);
              }
            }}
            className="flex items-center gap-1 pl-2.5 pr-1 py-1.5 rounded-l-full font-medium cursor-pointer"
            title={isShapeActive ? "Shape active (click to deselect)" : "Geometric Shapes"}
          >
            <ActiveShapeIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Shapes</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleShapesDropdown();
            }}
            className={`p-1.5 pr-2.5 rounded-r-full cursor-pointer flex items-center justify-center transition-colors min-w-[26px] min-h-[30px] ${
              isShapeActive
                ? "hover:bg-black/15 text-white"
                : "hover:bg-black/10 dark:hover:bg-white/10"
            }`}
            title="Select shape type"
            aria-label="Select shape type"
            aria-expanded={isShapesOpen}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isShapesOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Tool: Text Box */}
        <button
          type="button"
          onClick={() => onSelectTool(tool === "text" ? null : "text")}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer shrink-0 ${
            tool === "text"
              ? "bg-[#A85D44] text-white shadow-xs"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
          }`}
          title={tool === "text" ? "Text active (click to deselect)" : "Type Text Box"}
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
          title={tool === "eraser" ? "Eraser active (click to deselect)" : "Eraser"}
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
                onClick={() => {
                  onSelectColor(c.value);
                  if (tool === null) {
                    onSelectTool("pen");
                  }
                }}
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

        {/* Undo Annotation */}
        <button
          type="button"
          onClick={onUndo}
          disabled={canUndo !== undefined ? !canUndo : strokeCount === 0}
          className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          title="Undo (Ctrl+Z)"
          aria-label="Undo last annotation"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        {/* Redo Annotation */}
        {onRedo && (
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            aria-label="Redo last annotation"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        )}

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
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#A85D44] hover:bg-[#8F4C35] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-xs shadow-xs transition-colors cursor-pointer shrink-0"
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

    {/* Portaled Shapes Popover (escapes overflow-x-auto) */}
    {mounted && isShapesOpen && shapesCoords && createPortal(
      <div
        ref={shapesMenuRef}
        style={{
          position: "fixed",
          top: `${shapesCoords.top}px`,
          left: `${shapesCoords.left}px`,
          zIndex: 9999,
        }}
        className="min-w-[175px] p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl flex flex-col gap-0.5 animate-in fade-in-0 zoom-in-95 duration-100"
      >
        <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
          Shape
        </div>
        {SHAPE_DEFINITIONS.map((def) => {
          const IconComponent = def.icon;
          const isSelected = tool === def.type;
          return (
            <button
              key={def.type}
              type="button"
              onClick={() => {
                setActiveShapeType(def.type);
                onSelectTool(def.type);
                setIsShapesOpen(false);
              }}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
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
      </div>,
      document.body
    )}
  </aside>
);
}
