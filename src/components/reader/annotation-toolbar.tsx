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
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const [activeShapeType, setActiveShapeType] = useState<ShapeType>("rectangle");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isPenOpen, setIsPenOpen] = useState(false);
  const penDropdownRef = useRef<HTMLDivElement>(null);

  const isShapeActive = SHAPE_DEFINITIONS.some((s) => s.type === tool);
  const currentShapeType: ShapeType = isShapeActive ? (tool as ShapeType) : activeShapeType;
  const ActiveShapeIcon = SHAPE_DEFINITIONS.find((s) => s.type === currentShapeType)?.icon || Square;

  useEffect(() => {
    if (SHAPE_DEFINITIONS.some((s) => s.type === tool)) {
      setActiveShapeType(tool as ShapeType);
    }
  }, [tool]);

  useEffect(() => {
    if (!isShapesOpen && !isPenOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsShapesOpen(false);
      }
      if (penDropdownRef.current && !penDropdownRef.current.contains(e.target as Node)) {
        setIsPenOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isShapesOpen, isPenOpen]);

  // Mode 1: Contextual Text Box Styling Mode
  if (activeTextBox) {
    return (
      <aside
        aria-label="Text formatting controls"
        className={`print:hidden sticky top-20 z-40 max-w-fit mx-auto transition-all ${className}`}
      >
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-[#FAF8F5]/90 dark:bg-[#21201E]/90 backdrop-blur-md border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.08)] text-xs text-[#2D2926] dark:text-[#E3DFD7]">
          {/* Done editing text */}
          <button
            type="button"
            onClick={onDeselectTextBox}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-[#2D2926] dark:text-[#E3DFD7] font-medium transition-colors cursor-pointer"
            title="Done editing text"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Done</span>
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Bold toggle */}
          <button
            type="button"
            onClick={() => onUpdateActiveTextBox?.({ bold: !activeTextBox.bold })}
            className={`p-1.5 rounded-full font-bold transition-colors cursor-pointer ${
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
            className={`p-1.5 rounded-full italic transition-colors cursor-pointer ${
              activeTextBox.italic
                ? "bg-[#A85D44] text-white shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Font size selector */}
          <div className="flex items-center gap-1">
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

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Color palette */}
          <div className="flex items-center gap-1 px-1">
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

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Delete text box */}
          <button
            type="button"
            onClick={onDeleteActiveTextBox}
            className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title="Delete text box"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Mode 2: Contextual Shape Styling Mode
  if (activeShape) {
    return (
      <aside
        aria-label="Shape styling controls"
        className={`print:hidden sticky top-20 z-40 max-w-fit mx-auto transition-all ${className}`}
      >
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-[#FAF8F5]/90 dark:bg-[#21201E]/90 backdrop-blur-md border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.08)] text-xs text-[#2D2926] dark:text-[#E3DFD7]">
          {/* Done with shape */}
          <button
            type="button"
            onClick={onDeselectShape}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-[#2D2926] dark:text-[#E3DFD7] font-medium transition-colors cursor-pointer"
            title="Done editing shape"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Done</span>
          </button>

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Stroke Width pills */}
          <div className="flex items-center gap-1">
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

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Fill Opacity pills */}
          <div className="flex items-center gap-1">
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

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Color palette */}
          <div className="flex items-center gap-1 px-1">
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

          <span className="w-px h-4 bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Delete shape */}
          <button
            type="button"
            onClick={onDeleteActiveShape}
            className="p-1.5 rounded-full text-[#757069] dark:text-[#948F86] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            title="Delete shape"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  // Mode 3: Default Drawing Mode
  return (
    <aside
      aria-label="Annotation controls"
      className={`print:hidden sticky top-20 z-40 max-w-fit mx-auto transition-all ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 rounded-full bg-[#FAF8F5]/90 dark:bg-[#21201E]/90 backdrop-blur-md border border-[#E8E3D9] dark:border-[#33312E] shadow-[0_4px_20px_rgba(45,41,38,0.08)] text-xs text-[#2D2926] dark:text-[#E3DFD7]">
        {/* Tool: Pen Dropdown Popover */}
        <div className="relative" ref={penDropdownRef}>
          <button
            type="button"
            onClick={() => {
              if (tool !== "pen") {
                onSelectTool("pen");
              }
              setIsPenOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
              tool === "pen"
                ? "bg-[#A85D44] text-white shadow-xs"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
            }`}
            title="Freehand Pen (Click to select thickness)"
            aria-expanded={isPenOpen}
          >
            <Pen className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pen</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isPenOpen ? "rotate-180" : ""}`} />
          </button>

          {isPenOpen && (
            <div className="absolute top-full mt-2 left-0 z-50 min-w-[145px] p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-lg flex flex-col gap-0.5 animate-in fade-in-0 zoom-in-95 duration-100">
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
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
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
            </div>
          )}
        </div>

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
                onSelectTool(activeShapeType);
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
                      setActiveShapeType(def.type);
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
