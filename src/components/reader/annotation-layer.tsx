"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import type { AnnotationTool } from "./annotation-toolbar";
import { COLOR_PALETTE } from "./annotation-toolbar";
import { Trash2, Check, Move } from "lucide-react";

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationStroke {
  id: string;
  tool: "pen" | "highlighter" | "underline";
  points: AnnotationPoint[];
  color: string;
  width: number;
  opacity: number;
}

export interface AnnotationTextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  text: string;
  color: string;
}

export interface AnnotationLayerProps {
  noteId: string;
  pageNumber?: number;
  scale?: number;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  renderedWidth?: number;
  renderedHeight?: number;
  tool: AnnotationTool;
  color: string;
  strokes: AnnotationStroke[];
  onChangeStrokes: (strokes: AnnotationStroke[]) => void;
  textBoxes?: AnnotationTextBox[];
  onChangeTextBoxes?: (textBoxes: AnnotationTextBox[]) => void;
  className?: string;
}

export function pointsToSvgPath(points: AnnotationPoint[]): string {
  if (!points || points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y}, ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function AnnotationLayer({
  noteId,
  pageNumber,
  scale = 1.0,
  intrinsicWidth,
  intrinsicHeight,
  renderedWidth,
  renderedHeight,
  tool,
  color,
  strokes,
  onChangeStrokes,
  textBoxes: propTextBoxes,
  onChangeTextBoxes,
  className = "",
}: AnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentStroke, setCurrentStroke] = useState<AnnotationStroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Internal text box state if not controlled externally
  const [internalTextBoxes, setInternalTextBoxes] = useState<AnnotationTextBox[]>([]);
  const textBoxes = propTextBoxes !== undefined ? propTextBoxes : internalTextBoxes;
  const setTextBoxes = onChangeTextBoxes || setInternalTextBoxes;

  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  // Effective dimensions for SVG coordinate system
  const effectiveIntrinsicWidth = intrinsicWidth || renderedWidth || 800;
  const effectiveIntrinsicHeight = intrinsicHeight || renderedHeight || 1100;
  const currentScale = scale > 0 ? scale : 1.0;

  // 1. LocalStorage Auto-Persistence keyed by note ID and page number
  const strokesStorageKey =
    pageNumber !== undefined
      ? `vilekh_pdf_annotations_${noteId}_page_${pageNumber}`
      : `vilekh_annotations_${noteId}`;

  const textStorageKey =
    pageNumber !== undefined
      ? `vilekh_pdf_textboxes_${noteId}_page_${pageNumber}`
      : `vilekh_textboxes_${noteId}`;

  // Restore strokes and text boxes from localStorage on mount or page switch
  useEffect(() => {
    if (!noteId) return;

    try {
      const savedStrokes = localStorage.getItem(strokesStorageKey);
      if (savedStrokes) {
        const parsed = JSON.parse(savedStrokes);
        if (Array.isArray(parsed)) {
          onChangeStrokes(parsed);
        }
      } else {
        onChangeStrokes([]);
      }
    } catch {
      // Ignore storage read errors
    }

    try {
      const savedTextBoxes = localStorage.getItem(textStorageKey);
      if (savedTextBoxes) {
        const parsed = JSON.parse(savedTextBoxes);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((b: AnnotationTextBox) => ({
            ...b,
            width: b.width || 240,
          }));
          setTextBoxes(normalized);
        }
      } else {
        setTextBoxes([]);
      }
    } catch {
      // Ignore storage read errors
    }
  }, [noteId, strokesStorageKey, textStorageKey, onChangeStrokes, setTextBoxes]);

  // Save strokes to localStorage
  const updateStrokes = useCallback(
    (newStrokes: AnnotationStroke[]) => {
      onChangeStrokes(newStrokes);
      try {
        localStorage.setItem(strokesStorageKey, JSON.stringify(newStrokes));
      } catch {
        // Ignore storage write errors (e.g. quota)
      }
    },
    [onChangeStrokes, strokesStorageKey]
  );

  // Save text boxes to localStorage
  const updateTextBoxes = useCallback(
    (newBoxes: AnnotationTextBox[]) => {
      setTextBoxes(newBoxes);
      try {
        localStorage.setItem(textStorageKey, JSON.stringify(newBoxes));
      } catch {
        // Ignore storage write errors (e.g. quota)
      }
    },
    [setTextBoxes, textStorageKey]
  );

  // Clean up empty text boxes when switching away from the text tool
  useEffect(() => {
    if (tool !== "text") {
      setActiveTextId(null);
      const withContent = textBoxes.filter((b) => b.text.trim().length > 0);
      if (withContent.length !== textBoxes.length) {
        updateTextBoxes(withContent);
      }
    }
  }, [tool, textBoxes, updateTextBoxes]);

  // 2. Keyboard shortcuts for Undo and active text box deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";

      // Deselect or delete active box on Escape
      if (e.key === "Escape" && activeTextId) {
        const activeBox = textBoxes.find((b) => b.id === activeTextId);
        if (activeBox && !activeBox.text.trim()) {
          updateTextBoxes(textBoxes.filter((b) => b.id !== activeTextId));
        }
        setActiveTextId(null);
        return;
      }

      // Delete active text box if Delete or Backspace is pressed while not typing inside textarea
      if ((e.key === "Delete" || e.key === "Backspace") && activeTextId && !isTyping) {
        e.preventDefault();
        updateTextBoxes(textBoxes.filter((b) => b.id !== activeTextId));
        setActiveTextId(null);
        return;
      }

      // Undo strokes/boxes with Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !isTyping) {
        if (strokes.length > 0) {
          e.preventDefault();
          updateStrokes(strokes.slice(0, -1));
        } else if (textBoxes.length > 0) {
          e.preventDefault();
          updateTextBoxes(textBoxes.slice(0, -1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [strokes, textBoxes, activeTextId, updateStrokes, updateTextBoxes]);

  // Helper to extract point in intrinsic PDF points (72 DPI coordinates)
  const getPoint = (e: React.PointerEvent<SVGSVGElement>): AnnotationPoint => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Normalizing screen pixels to intrinsic PDF points
    const ptX = Number((screenX / currentScale).toFixed(2));
    const ptY = Number((screenY / currentScale).toFixed(2));
    return { x: ptX, y: ptY };
  };

  const isDrawingTool = tool === "pen" || tool === "highlighter" || tool === "underline";

  // 3. SVG Pointer event handlers for drawing
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingTool) return;

    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const pt = getPoint(e);
    setIsDrawing(true);

    if (tool === "pen") {
      setCurrentStroke({
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tool: "pen",
        points: [pt],
        color,
        width: 2.5,
        opacity: 0.95,
      });
    } else if (tool === "highlighter") {
      const option = COLOR_PALETTE.find((c) => c.value === color);
      const hlColor = option ? option.highlighterValue : "rgba(245, 158, 11, 0.4)";
      setCurrentStroke({
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tool: "highlighter",
        points: [pt],
        color: hlColor,
        width: 18,
        opacity: 0.4,
      });
    } else if (tool === "underline") {
      setCurrentStroke({
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tool: "underline",
        points: [pt, pt],
        color,
        width: 3,
        opacity: 0.85,
      });
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !currentStroke) return;

    const pt = getPoint(e);

    if (currentStroke.tool === "underline") {
      const startPt = currentStroke.points[0];
      const diffY = Math.abs(pt.y - startPt.y);
      const finalY = diffY < 6 ? startPt.y : pt.y;
      setCurrentStroke({
        ...currentStroke,
        points: [startPt, { x: pt.x, y: finalY }],
      });
    } else {
      setCurrentStroke({
        ...currentStroke,
        points: [...currentStroke.points, pt],
      });
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !currentStroke) return;

    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    setIsDrawing(false);
    if (currentStroke.points.length > 0) {
      updateStrokes([...strokes, currentStroke]);
    }
    setCurrentStroke(null);
  };

  // Erase individual stroke
  const handleDeleteStroke = (strokeId: string) => {
    if (tool === "eraser") {
      updateStrokes(strokes.filter((s) => s.id !== strokeId));
    }
  };

  // 4. Text tool container click: spawn new Word/Docs-style text box normalized to intrinsic points
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".annotation-text-box") ||
      target.closest("button") ||
      target.closest("textarea")
    ) {
      return;
    }

    if (activeTextId) {
      const activeBox = textBoxes.find((b) => b.id === activeTextId);
      if (activeBox && !activeBox.text.trim()) {
        updateTextBoxes(textBoxes.filter((b) => b.id !== activeTextId));
      }
      setActiveTextId(null);
      if (tool !== "text") return;
    }

    if (tool !== "text") return;

    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = (e.clientX - rect.left) / currentScale;
    const clickY = (e.clientY - rect.top) / currentScale;

    const defaultWidth = 220;
    const boundedX = Math.max(10, Math.min(effectiveIntrinsicWidth - defaultWidth - 10, Math.round(clickX)));
    const boundedY = Math.max(10, Math.round(clickY));

    const cleanedBoxes = textBoxes.filter((b) =>
      b.id === activeTextId ? b.text.trim().length > 0 : true
    );

    const newId = `tb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBox: AnnotationTextBox = {
      id: newId,
      x: boundedX,
      y: boundedY,
      width: defaultWidth,
      text: "",
      color,
    };

    updateTextBoxes([...cleanedBoxes, newBox]);
    setActiveTextId(newId);
  };

  const handleUpdateTextBox = (id: string, updates: Partial<AnnotationTextBox>) => {
    const updated = textBoxes.map((b) => (b.id === id ? { ...b, ...updates } : b));
    updateTextBoxes(updated);
  };

  const handleDeleteTextBox = (id: string) => {
    const updated = textBoxes.filter((b) => b.id !== id);
    updateTextBoxes(updated);
    if (activeTextId === id) {
      setActiveTextId(null);
    }
  };

  const isInteractive = tool !== "cursor";

  return (
    <div
      ref={containerRef}
      onPointerDown={handleContainerPointerDown}
      className={`absolute inset-0 w-full h-full bg-transparent ${
        isInteractive ? "pointer-events-auto" : "pointer-events-none"
      } ${tool === "text" ? "cursor-text" : ""} ${className}`}
    >
      {/* Vector SVG Layer for Pen, Highlighter, and Underlines */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${effectiveIntrinsicWidth} ${effectiveIntrinsicHeight}`}
        preserveAspectRatio="none"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerCancel={handleSvgPointerUp}
        className={`absolute inset-0 w-full h-full select-none ${
          isDrawingTool
            ? "cursor-crosshair pointer-events-auto"
            : tool === "eraser"
            ? "cursor-pointer pointer-events-auto"
            : "pointer-events-none"
        }`}
        style={{
          touchAction: isDrawingTool ? "none" : "auto",
        }}
      >
        <defs>
          <filter id="highlighter-blend">
            <feBlend mode="multiply" />
          </filter>
        </defs>

        {/* Render saved strokes */}
        {strokes.map((stroke) => {
          const isHighlighter = stroke.tool === "highlighter";
          const isUnderline = stroke.tool === "underline";

          if (isUnderline && stroke.points.length >= 2) {
            const p1 = stroke.points[0];
            const p2 = stroke.points[stroke.points.length - 1];
            return (
              <line
                key={stroke.id}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeOpacity={stroke.opacity}
                onClick={() => handleDeleteStroke(stroke.id)}
                className={
                  tool === "eraser"
                    ? "cursor-pointer hover:stroke-red-500 hover:opacity-100"
                    : ""
                }
                pointerEvents={tool === "eraser" ? "stroke" : "none"}
              />
            );
          }

          const pathData = pointsToSvgPath(stroke.points);
          return (
            <path
              key={stroke.id}
              d={pathData}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={stroke.opacity}
              style={isHighlighter ? { mixBlendMode: "multiply" } : undefined}
              onClick={() => handleDeleteStroke(stroke.id)}
              className={
                tool === "eraser"
                  ? "cursor-pointer hover:stroke-red-500 hover:opacity-100"
                  : ""
              }
              pointerEvents={tool === "eraser" ? "stroke" : "none"}
            />
          );
        })}

        {/* Render active stroke in progress */}
        {currentStroke &&
          (currentStroke.tool === "underline" && currentStroke.points.length >= 2 ? (
            <line
              x1={currentStroke.points[0].x}
              y1={currentStroke.points[0].y}
              x2={currentStroke.points[currentStroke.points.length - 1].x}
              y2={currentStroke.points[currentStroke.points.length - 1].y}
              stroke={currentStroke.color}
              strokeWidth={currentStroke.width}
              strokeLinecap="round"
              strokeOpacity={currentStroke.opacity}
              pointerEvents="none"
            />
          ) : (
            <path
              d={pointsToSvgPath(currentStroke.points)}
              fill="none"
              stroke={currentStroke.color}
              strokeWidth={currentStroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={currentStroke.opacity}
              style={currentStroke.tool === "highlighter" ? { mixBlendMode: "multiply" } : undefined}
              pointerEvents="none"
            />
          ))}
      </svg>

      {/* Positioned Word/Docs-Style HTML Text Boxes Layer */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {textBoxes.map((box) => (
          <WordDocsTextBoxItem
            key={box.id}
            box={box}
            scale={currentScale}
            tool={tool}
            isSelected={activeTextId === box.id}
            onSelect={() => setActiveTextId(box.id)}
            onDeselect={() => {
              if (activeTextId === box.id) {
                setActiveTextId(null);
              }
            }}
            onUpdate={(updates) => handleUpdateTextBox(box.id, updates)}
            onDelete={() => handleDeleteTextBox(box.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface WordDocsTextBoxItemProps {
  box: AnnotationTextBox;
  scale: number;
  tool: AnnotationTool;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onUpdate: (updates: Partial<AnnotationTextBox>) => void;
  onDelete: () => void;
}

function WordDocsTextBoxItem({
  box,
  scale,
  tool,
  isSelected,
  onSelect,
  onDeselect,
  onUpdate,
  onDelete,
}: WordDocsTextBoxItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; boxX: number; boxY: number } | null>(
    null
  );
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Focus textarea when selected
  useEffect(() => {
    if (isSelected && textareaRef.current) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isSelected]);

  // Auto-resize height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(36 * scale, textareaRef.current.scrollHeight)}px`;
    }
  }, [box.text, isSelected, box.width, scale]);

  // 1. Move/Drag interaction via the bounding frame
  const handleFrameDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      boxX: box.x,
      boxY: box.y,
    };
  };

  const handleFrameDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / scale;
    const dy = (e.clientY - dragRef.current.startY) / scale;
    const newX = Math.max(0, Math.round(dragRef.current.boxX + dx));
    const newY = Math.max(0, Math.round(dragRef.current.boxY + dy));
    onUpdate({ x: newX, y: newY });
  };

  const handleFrameDragEnd = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    dragRef.current = null;
  };

  // 2. Resize interaction via the corner/edge handle
  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    resizeRef.current = {
      startX: e.clientX,
      startWidth: box.width || 220,
    };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const dx = (e.clientX - resizeRef.current.startX) / scale;
    const newWidth = Math.max(120, Math.min(800, Math.round(resizeRef.current.startWidth + dx)));
    onUpdate({ width: newWidth });
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    resizeRef.current = null;
  };

  const isEraser = tool === "eraser";
  const isDrawingTool = tool === "pen" || tool === "highlighter" || tool === "underline";
  const boxWidth = box.width || 220;

  // Render coordinates scaled to current screen view
  const screenLeft = Math.round(box.x * scale);
  const screenTop = Math.round(box.y * scale);
  const screenWidth = Math.round(boxWidth * scale);

  // Hide empty boxes when deselected and tool is not text
  if (!box.text.trim() && !isSelected && tool !== "text") {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${screenLeft}px`,
        top: `${screenTop}px`,
        width: `${screenWidth}px`,
      }}
      className={`annotation-text-box select-none transition-shadow ${
        isDrawingTool
          ? "pointer-events-none z-10"
          : isEraser
          ? "pointer-events-auto z-20 cursor-pointer"
          : isSelected
          ? "pointer-events-auto z-30"
          : "pointer-events-auto z-10 cursor-pointer"
      }`}
      onPointerDown={(e) => {
        if (isEraser) {
          e.stopPropagation();
          onDelete();
        } else if (!isSelected && (tool === "text" || tool === "cursor")) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      {/* Outer Word/Docs Box Container */}
      <div
        className={`relative rounded-md p-2 transition-colors ${
          isEraser
            ? "border-2 border-dashed border-red-500 bg-red-50/50 dark:bg-red-950/40 shadow-sm"
            : isSelected
            ? "border-1.5 border-[#2563EB] dark:border-[#3B82F6] bg-transparent shadow-sm ring-2 ring-[#2563EB]/20"
            : "border border-dashed border-stone-300/60 dark:border-stone-700/60 bg-transparent hover:border-[#A85D44]"
        }`}
      >
        {/* Top Floating Docs Action Bar when Selected */}
        {isSelected && (
          <div className="print:hidden absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-0.5 rounded-md bg-[#2D2926] dark:bg-[#FAF8F5] text-white dark:text-[#21201E] text-[11px] shadow-md z-40 select-none">
            {/* Drag frame handle */}
            <div
              onPointerDown={handleFrameDragStart}
              onPointerMove={handleFrameDragMove}
              onPointerUp={handleFrameDragEnd}
              onPointerCancel={handleFrameDragEnd}
              className="flex items-center gap-1 cursor-move hover:opacity-80 py-0.5"
              title="Click and drag to move text box"
            >
              <Move className="w-3 h-3" />
              <span className="font-medium text-[10px] tracking-wide uppercase">Move</span>
            </div>

            {/* Size indicator & Done/Delete buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] opacity-75 font-mono">{boxWidth}pt</span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 rounded hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                title="Delete text box"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!box.text.trim()) {
                    onDelete();
                  } else {
                    onDeselect();
                  }
                }}
                className="p-1 rounded hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                title="Deselect and save"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Word/Docs Selection Corner Resize Handles */}
        {isSelected && (
          <>
            {/* Top-Left selection dot */}
            <span
              aria-hidden="true"
              className="print:hidden absolute -top-1.5 -left-1.5 w-2 h-2 rounded-xs bg-white border border-[#2563EB] shadow-xs pointer-events-none"
            />
            {/* Top-Right selection dot */}
            <span
              aria-hidden="true"
              className="print:hidden absolute -top-1.5 -right-1.5 w-2 h-2 rounded-xs bg-white border border-[#2563EB] shadow-xs pointer-events-none"
            />
            {/* Bottom-Left selection dot */}
            <span
              aria-hidden="true"
              className="print:hidden absolute -bottom-1.5 -left-1.5 w-2 h-2 rounded-xs bg-white border border-[#2563EB] shadow-xs pointer-events-none"
            />
            {/* Right edge resize handle (Drag to widen/narrow) */}
            <div
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              onPointerCancel={handleResizeEnd}
              className="print:hidden absolute top-1/2 -right-2 -translate-y-1/2 w-3.5 h-5 flex items-center justify-center cursor-ew-resize hover:scale-125 transition-transform z-30"
              title="Drag horizontally to resize text box width"
            >
              <div className="w-2 h-3 rounded-xs bg-white border-2 border-[#2563EB] shadow-xs" />
            </div>
          </>
        )}

        {/* Eraser Indicator */}
        {isEraser && (
          <div className="print:hidden flex items-center gap-1 pb-1 mb-1 text-[11px] font-semibold text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Click to delete</span>
          </div>
        )}

        {/* Text Area (Editing when Selected) */}
        {isSelected ? (
          <textarea
            ref={textareaRef}
            value={box.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Type note here..."
            className="w-full bg-transparent resize-none outline-none font-sans text-sm leading-relaxed border-none p-0 focus:ring-0 placeholder:text-stone-400 select-text"
            style={{
              color: box.color,
              fontSize: `${Math.max(12, 14 * scale)}px`,
            }}
            rows={2}
          />
        ) : !box.text.trim() && tool === "text" ? (
          /* Empty placeholder indicator in text mode */
          <div
            className="font-sans italic text-stone-400 py-1"
            style={{ fontSize: `${Math.max(11, 12 * scale)}px` }}
          >
            Click to type note...
          </div>
        ) : (
          /* Rendered Multiline Text when Deselected */
          <div
            className="font-sans leading-relaxed whitespace-pre-wrap select-text break-words"
            style={{
              color: box.color,
              fontSize: `${Math.max(12, 14 * scale)}px`,
            }}
          >
            {box.text}
          </div>
        )}
      </div>
    </div>
  );
}
