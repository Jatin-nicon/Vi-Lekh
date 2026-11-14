"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import type { AnnotationTool, ShapeType } from "./annotation-toolbar";
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

export interface AnnotationShape {
  id: string;
  type: ShapeType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  fillOpacity?: number; // 0 (outline), 0.2 (tint), 0.5 (medium), 1.0 (solid)
}

export interface AnnotationTextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  text: string;
  color: string;
  fontSize?: number; // 12, 14, 18, 24 (default 14)
  bold?: boolean;
  italic?: boolean;
  hasBorder?: boolean;
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
  penWidth?: number;
  shapeWidth?: number;
  shapeFillOpacity?: number;
  strokes: AnnotationStroke[];
  onChangeStrokes: (strokes: AnnotationStroke[]) => void;
  textBoxes?: AnnotationTextBox[];
  onChangeTextBoxes?: (textBoxes: AnnotationTextBox[]) => void;
  shapes?: AnnotationShape[];
  onChangeShapes?: (shapes: AnnotationShape[]) => void;
  activeShapeId?: string | null;
  onSelectShape?: (shapeId: string | null) => void;
  activeTextId?: string | null;
  onSelectText?: (textId: string | null) => void;
  className?: string;
}

export function isShapeTool(tool: AnnotationTool): tool is ShapeType {
  return (
    tool === "rectangle" ||
    tool === "circle" ||
    tool === "arrow" ||
    tool === "line" ||
    tool === "star" ||
    tool === "cloud"
  );
}

export function arrowToSvgPath(startX: number, startY: number, endX: number, endY: number): string {
  const angle = Math.atan2(endY - startY, endX - startX);
  const headLength = 14;
  const headAngle = Math.PI / 6;

  const p1X = endX - headLength * Math.cos(angle - headAngle);
  const p1Y = endY - headLength * Math.sin(angle - headAngle);
  const p2X = endX - headLength * Math.cos(angle + headAngle);
  const p2Y = endY - headLength * Math.sin(angle + headAngle);

  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)} M ${p1X.toFixed(1)} ${p1Y.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)} L ${p2X.toFixed(1)} ${p2Y.toFixed(1)}`;
}

export function starToSvgPath(minX: number, minY: number, w: number, h: number): string {
  const cx = minX + w / 2;
  const cy = minY + h / 2;
  const outerRx = w / 2;
  const outerRy = h / 2;
  const innerRx = outerRx * 0.42;
  const innerRy = outerRy * 0.42;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const rx = i % 2 === 0 ? outerRx : innerRx;
    const ry = i % 2 === 0 ? outerRy : innerRy;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += " Z";
  return d;
}

export function cloudToSvgPath(minX: number, minY: number, w: number, h: number): string {
  const x = minX;
  const y = minY;
  return [
    `M ${(x + 0.18 * w).toFixed(1)} ${(y + 0.72 * h).toFixed(1)}`,
    `C ${(x + 0.22 * w).toFixed(1)} ${(y + 0.98 * h).toFixed(1)}, ${(x + 0.45 * w).toFixed(1)} ${(y + 0.98 * h).toFixed(1)}, ${(x + 0.52 * w).toFixed(1)} ${(y + 0.82 * h).toFixed(1)}`,
    `C ${(x + 0.58 * w).toFixed(1)} ${(y + 0.98 * h).toFixed(1)}, ${(x + 0.82 * w).toFixed(1)} ${(y + 0.98 * h).toFixed(1)}, ${(x + 0.86 * w).toFixed(1)} ${(y + 0.72 * h).toFixed(1)}`,
    `C ${(x + 1.02 * w).toFixed(1)} ${(y + 0.68 * h).toFixed(1)}, ${(x + 1.02 * w).toFixed(1)} ${(y + 0.35 * h).toFixed(1)}, ${(x + 0.85 * w).toFixed(1)} ${(y + 0.28 * h).toFixed(1)}`,
    `C ${(x + 0.88 * w).toFixed(1)} ${(y + 0.02 * h).toFixed(1)}, ${(x + 0.65 * w).toFixed(1)} ${(y + 0.02 * h).toFixed(1)}, ${(x + 0.55 * w).toFixed(1)} ${(y + 0.18 * h).toFixed(1)}`,
    `C ${(x + 0.48 * w).toFixed(1)} ${(y + 0.02 * h).toFixed(1)}, ${(x + 0.28 * w).toFixed(1)} ${(y + 0.02 * h).toFixed(1)}, ${(x + 0.22 * w).toFixed(1)} ${(y + 0.22 * h).toFixed(1)}`,
    `C ${(x - 0.02 * w).toFixed(1)} ${(y + 0.25 * h).toFixed(1)}, ${(x - 0.02 * w).toFixed(1)} ${(y + 0.65 * h).toFixed(1)}, ${(x + 0.18 * w).toFixed(1)} ${(y + 0.72 * h).toFixed(1)}`,
    "Z",
  ].join(" ");
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
  penWidth = 2.5,
  shapeWidth = 2.0,
  shapeFillOpacity = 0.0,
  strokes,
  onChangeStrokes,
  textBoxes: propTextBoxes,
  onChangeTextBoxes,
  shapes: propShapes,
  onChangeShapes,
  activeShapeId: propActiveShapeId,
  onSelectShape,
  activeTextId: propActiveTextId,
  onSelectText,
  className = "",
}: AnnotationLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentStroke, setCurrentStroke] = useState<AnnotationStroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Internal shapes state if not controlled externally
  const [internalShapes, setInternalShapes] = useState<AnnotationShape[]>([]);
  const shapes = propShapes !== undefined ? propShapes : internalShapes;
  const setShapes = onChangeShapes || setInternalShapes;

  // Controlled or uncontrolled activeShapeId
  const [internalActiveShapeId, setInternalActiveShapeId] = useState<string | null>(null);
  const activeShapeId = propActiveShapeId !== undefined ? propActiveShapeId : internalActiveShapeId;
  const setActiveShapeId = useCallback(
    (id: string | null) => {
      if (onSelectShape) onSelectShape(id);
      else setInternalActiveShapeId(id);
    },
    [onSelectShape]
  );

  // Real-time drag-to-draw preview for shapes
  const [previewShape, setPreviewShape] = useState<AnnotationShape | null>(null);

  // Internal text box state if not controlled externally
  const [internalTextBoxes, setInternalTextBoxes] = useState<AnnotationTextBox[]>([]);
  const textBoxes = propTextBoxes !== undefined ? propTextBoxes : internalTextBoxes;
  const setTextBoxes = onChangeTextBoxes || setInternalTextBoxes;

  // Controlled or uncontrolled activeTextId
  const [internalActiveTextId, setInternalActiveTextId] = useState<string | null>(null);
  const activeTextId = propActiveTextId !== undefined ? propActiveTextId : internalActiveTextId;
  const setActiveTextId = useCallback(
    (id: string | null) => {
      if (onSelectText) onSelectText(id);
      else setInternalActiveTextId(id);
    },
    [onSelectText]
  );

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

  const shapesStorageKey =
    pageNumber !== undefined
      ? `vilekh_pdf_shapes_${noteId}_page_${pageNumber}`
      : `vilekh_shapes_${noteId}`;

  // Keep latest callback references without triggering effect re-executions
  const onChangeStrokesRef = useRef(onChangeStrokes);
  const setTextBoxesRef = useRef(setTextBoxes);
  const setShapesRef = useRef(setShapes);
  useEffect(() => {
    onChangeStrokesRef.current = onChangeStrokes;
    setTextBoxesRef.current = setTextBoxes;
    setShapesRef.current = setShapes;
  });

  // Track initial load per note and page so localStorage read runs exactly once
  const initializedKeyRef = useRef<string>("");

  // Restore strokes, text boxes, and shapes from localStorage on mount or page switch
  useEffect(() => {
    if (!noteId || typeof window === "undefined") return;

    const currentKey = `${noteId}_${strokesStorageKey}_${textStorageKey}_${shapesStorageKey}`;
    if (initializedKeyRef.current === currentKey) return;
    initializedKeyRef.current = currentKey;

    try {
      const savedStrokes = localStorage.getItem(strokesStorageKey);
      if (savedStrokes) {
        const parsed = JSON.parse(savedStrokes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onChangeStrokesRef.current(parsed);
        }
      }
    } catch {
      // Ignore storage read errors
    }

    try {
      const savedTextBoxes = localStorage.getItem(textStorageKey);
      if (savedTextBoxes) {
        const parsed = JSON.parse(savedTextBoxes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((b: AnnotationTextBox) => ({
            ...b,
            width: b.width || 240,
          }));
          setTextBoxesRef.current(normalized);
        }
      }
    } catch {
      // Ignore storage read errors
    }

    try {
      const savedShapes = localStorage.getItem(shapesStorageKey);
      if (savedShapes) {
        const parsed = JSON.parse(savedShapes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShapesRef.current(parsed);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, [noteId, strokesStorageKey, textStorageKey, shapesStorageKey]);

  // Save strokes to localStorage
  const updateStrokes = useCallback(
    (newStrokes: AnnotationStroke[]) => {
      onChangeStrokesRef.current(newStrokes);
      try {
        localStorage.setItem(strokesStorageKey, JSON.stringify(newStrokes));
      } catch {
        // Ignore storage write errors (e.g. quota)
      }
    },
    [strokesStorageKey]
  );

  // Save text boxes to localStorage
  const updateTextBoxes = useCallback(
    (newBoxes: AnnotationTextBox[]) => {
      setTextBoxesRef.current(newBoxes);
      try {
        localStorage.setItem(textStorageKey, JSON.stringify(newBoxes));
      } catch {
        // Ignore storage write errors (e.g. quota)
      }
    },
    [textStorageKey]
  );

  // Save shapes to localStorage
  const updateShapes = useCallback(
    (newShapes: AnnotationShape[]) => {
      setShapesRef.current(newShapes);
      try {
        localStorage.setItem(shapesStorageKey, JSON.stringify(newShapes));
      } catch {
        // Ignore storage write errors (e.g. quota)
      }
    },
    [shapesStorageKey]
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

      // Undo strokes/shapes/boxes with Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !isTyping) {
        if (strokes.length > 0) {
          e.preventDefault();
          updateStrokes(strokes.slice(0, -1));
        } else if (shapes.length > 0) {
          e.preventDefault();
          updateShapes(shapes.slice(0, -1));
        } else if (textBoxes.length > 0) {
          e.preventDefault();
          updateTextBoxes(textBoxes.slice(0, -1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [strokes, shapes, textBoxes, activeTextId, updateStrokes, updateShapes, updateTextBoxes]);

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

  const isShape = isShapeTool(tool);
  const isDrawingTool = tool === "pen" || tool === "highlighter" || tool === "underline" || isShape;

  // 3. SVG Pointer event handlers for drawing & shapes
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingTool) return;

    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const pt = getPoint(e);
    setIsDrawing(true);

    if (isShape) {
      setActiveShapeId(null);
      setActiveTextId(null);
      setPreviewShape({
        id: "preview",
        type: tool,
        startX: pt.x,
        startY: pt.y,
        endX: pt.x,
        endY: pt.y,
        color,
        width: shapeWidth,
        fillOpacity: shapeFillOpacity,
      });
      return;
    }

    if (tool === "pen") {
      setActiveShapeId(null);
      setActiveTextId(null);
      setCurrentStroke({
        id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tool: "pen",
        points: [pt],
        color,
        width: penWidth,
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
    if (!isDrawing) return;

    const pt = getPoint(e);

    if (previewShape) {
      setPreviewShape({
        ...previewShape,
        endX: pt.x,
        endY: pt.y,
      });
      return;
    }

    if (!currentStroke) return;

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
    if (!isDrawing) return;

    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    setIsDrawing(false);

    if (previewShape) {
      const dist = Math.hypot(
        previewShape.endX - previewShape.startX,
        previewShape.endY - previewShape.startY
      );
      if (dist >= 3) {
        const newShape: AnnotationShape = {
          id: `shape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: previewShape.type,
          startX: previewShape.startX,
          startY: previewShape.startY,
          endX: previewShape.endX,
          endY: previewShape.endY,
          color: previewShape.color,
          width: previewShape.width || shapeWidth,
          fillOpacity: previewShape.fillOpacity ?? shapeFillOpacity,
        };
        updateShapes([...shapes, newShape]);
        setActiveShapeId(newShape.id);
      }
      setPreviewShape(null);
      return;
    }

    if (currentStroke && currentStroke.points.length > 0) {
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

  // Erase individual shape
  const handleDeleteShape = (shapeId: string) => {
    updateShapes(shapes.filter((s) => s.id !== shapeId));
    if (activeShapeId === shapeId) {
      setActiveShapeId(null);
    }
  };

  const handleUpdateShape = (shapeId: string, updates: Partial<AnnotationShape>) => {
    const updated = shapes.map((s) => (s.id === shapeId ? { ...s, ...updates } : s));
    updateShapes(updated);
  };

  // Helper to render an SVG shape element
  const renderShapeElement = (shape: AnnotationShape, isPreview = false) => {
    const isEraser = tool === "eraser";
    const isSelected = activeShapeId === shape.id;
    const eraserProps =
      isEraser && !isPreview
        ? {
            onClick: () => handleDeleteShape(shape.id),
            className: "cursor-pointer hover:stroke-red-500 hover:opacity-100",
          }
        : !isPreview
        ? {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              setActiveTextId(null);
              setActiveShapeId(shape.id);
            },
            className: "cursor-pointer hover:opacity-90",
          }
        : {};

    const fillVal =
      shape.fillOpacity && shape.fillOpacity > 0
        ? shape.color
        : isPreview
        ? "none"
        : "transparent";
    const fillOpacityVal =
      shape.fillOpacity && shape.fillOpacity > 0 ? shape.fillOpacity : undefined;
    const strokeWidthVal = shape.width || 2;
    const strokeColorVal = shape.color;
    const pointerEventsVal = isPreview ? "none" : "all";

    switch (shape.type) {
      case "rectangle": {
        const minX = Math.min(shape.startX, shape.endX);
        const minY = Math.min(shape.startY, shape.endY);
        const w = Math.max(1, Math.abs(shape.endX - shape.startX));
        const h = Math.max(1, Math.abs(shape.endY - shape.startY));
        return (
          <rect
            key={shape.id}
            x={minX}
            y={minY}
            width={w}
            height={h}
            rx={3}
            fill={fillVal}
            fillOpacity={fillOpacityVal}
            stroke={strokeColorVal}
            strokeWidth={strokeWidthVal}
            strokeDasharray={isPreview ? "4 3" : undefined}
            pointerEvents={pointerEventsVal}
            {...eraserProps}
          />
        );
      }
      case "circle": {
        const cx = (shape.startX + shape.endX) / 2;
        const cy = (shape.startY + shape.endY) / 2;
        const rx = Math.max(1, Math.abs(shape.endX - shape.startX) / 2);
        const ry = Math.max(1, Math.abs(shape.endY - shape.startY) / 2);
        return (
          <ellipse
            key={shape.id}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={fillVal}
            fillOpacity={fillOpacityVal}
            stroke={strokeColorVal}
            strokeWidth={strokeWidthVal}
            strokeDasharray={isPreview ? "4 3" : undefined}
            pointerEvents={pointerEventsVal}
            {...eraserProps}
          />
        );
      }
      case "line": {
        return (
          <g key={shape.id} {...eraserProps}>
            {!isPreview && (
              <line
                x1={shape.startX}
                y1={shape.startY}
                x2={shape.endX}
                y2={shape.endY}
                stroke="transparent"
                strokeWidth={Math.max(16, strokeWidthVal + 12)}
                strokeLinecap="round"
                pointerEvents="stroke"
              />
            )}
            <line
              x1={shape.startX}
              y1={shape.startY}
              x2={shape.endX}
              y2={shape.endY}
              stroke={strokeColorVal}
              strokeWidth={strokeWidthVal}
              strokeLinecap="round"
              strokeDasharray={isPreview ? "4 3" : undefined}
              pointerEvents={isPreview ? "none" : "stroke"}
            />
          </g>
        );
      }
      case "arrow": {
        const pathData = arrowToSvgPath(shape.startX, shape.startY, shape.endX, shape.endY);
        return (
          <g key={shape.id} {...eraserProps}>
            {!isPreview && (
              <path
                d={pathData}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(16, strokeWidthVal + 12)}
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="stroke"
              />
            )}
            <path
              d={pathData}
              fill="none"
              stroke={strokeColorVal}
              strokeWidth={strokeWidthVal}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isPreview ? "4 3" : undefined}
              pointerEvents={isPreview ? "none" : "stroke"}
            />
          </g>
        );
      }
      case "star": {
        const minX = Math.min(shape.startX, shape.endX);
        const minY = Math.min(shape.startY, shape.endY);
        const w = Math.max(1, Math.abs(shape.endX - shape.startX));
        const h = Math.max(1, Math.abs(shape.endY - shape.startY));
        const pathData = starToSvgPath(minX, minY, w, h);
        return (
          <path
            key={shape.id}
            d={pathData}
            fill={fillVal}
            fillOpacity={fillOpacityVal}
            stroke={strokeColorVal}
            strokeWidth={strokeWidthVal}
            strokeLinejoin="round"
            strokeDasharray={isPreview ? "4 3" : undefined}
            pointerEvents={pointerEventsVal}
            {...eraserProps}
          />
        );
      }
      case "cloud": {
        const minX = Math.min(shape.startX, shape.endX);
        const minY = Math.min(shape.startY, shape.endY);
        const w = Math.max(1, Math.abs(shape.endX - shape.startX));
        const h = Math.max(1, Math.abs(shape.endY - shape.startY));
        const pathData = cloudToSvgPath(minX, minY, w, h);
        return (
          <path
            key={shape.id}
            d={pathData}
            fill={fillVal}
            fillOpacity={fillOpacityVal}
            stroke={strokeColorVal}
            strokeWidth={strokeWidthVal}
            strokeLinejoin="round"
            strokeDasharray={isPreview ? "4 3" : undefined}
            pointerEvents={pointerEventsVal}
            {...eraserProps}
          />
        );
      }
      default:
        return null;
    }
  };

  // 4. Text tool container click: spawn new Word/Docs-style text box normalized to intrinsic points
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".annotation-text-box") ||
      target.closest(".shape-selection-frame") ||
      target.closest("button") ||
      target.closest("textarea")
    ) {
      return;
    }

    if (activeShapeId) {
      setActiveShapeId(null);
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
      fontSize: 14,
      bold: false,
      italic: false,
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

  const isInteractive = true;
  const activeShape = shapes.find((s) => s.id === activeShapeId) || null;

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

        {/* Render saved geometric shapes */}
        {shapes.map((shape) => renderShapeElement(shape))}

        {/* Render active shape preview in progress */}
        {previewShape && renderShapeElement(previewShape, true)}

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

      {/* Positioned Word/Docs-Style HTML Text Boxes and Shape Selection Frame */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {textBoxes.map((box) => (
          <WordDocsTextBoxItem
            key={box.id}
            box={box}
            scale={currentScale}
            tool={tool}
            isSelected={activeTextId === box.id}
            onSelect={() => {
              setActiveShapeId(null);
              setActiveTextId(box.id);
            }}
            onDeselect={() => {
              if (activeTextId === box.id) {
                setActiveTextId(null);
              }
            }}
            onUpdate={(updates) => handleUpdateTextBox(box.id, updates)}
            onDelete={() => handleDeleteTextBox(box.id)}
          />
        ))}

        {/* Selected Shape Move/Resize Bounding Frame */}
        {activeShape && (
          <ShapeSelectionFrame
            shape={activeShape}
            scale={currentScale}
            onDeselect={() => setActiveShapeId(null)}
            onUpdate={(updates) => handleUpdateShape(activeShape.id, updates)}
            onDelete={() => handleDeleteShape(activeShape.id)}
          />
        )}
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
        } else if (!isSelected && tool === "text") {
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
            : box.hasBorder
            ? "border border-solid border-stone-300 dark:border-stone-700 bg-transparent hover:border-[#A85D44]"
            : "border border-transparent bg-transparent hover:border-dashed hover:border-stone-300/60 dark:hover:border-stone-700/60"
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
              className="print:hidden absolute -top-1.5 -left-1.5 w-3 h-3 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-1.5 border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] pointer-events-none"
            />
            {/* Top-Right selection dot */}
            <span
              aria-hidden="true"
              className="print:hidden absolute -top-1.5 -right-1.5 w-3 h-3 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-1.5 border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] pointer-events-none"
            />
            {/* Bottom-Left selection dot */}
            <span
              aria-hidden="true"
              className="print:hidden absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-1.5 border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] pointer-events-none"
            />
            {/* Right edge resize handle (Drag to widen/narrow) */}
            <div
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              onPointerCancel={handleResizeEnd}
              className="print:hidden absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-6 flex items-center justify-center cursor-ew-resize hover:scale-125 transition-transform z-30"
              title="Drag horizontally to resize text box width"
            >
              <div className="w-2.5 h-4 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-1.5 border-white shadow-[0_2px_5px_rgba(0,0,0,0.4)]" />
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
              fontSize: `${Math.max(12, (box.fontSize || 14) * scale)}px`,
              fontWeight: box.bold ? "bold" : "normal",
              fontStyle: box.italic ? "italic" : "normal",
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
              fontSize: `${Math.max(12, (box.fontSize || 14) * scale)}px`,
              fontWeight: box.bold ? "bold" : "normal",
              fontStyle: box.italic ? "italic" : "normal",
            }}
          >
            {box.text}
          </div>
        )}
      </div>
    </div>
  );
}

interface ShapeSelectionFrameProps {
  shape: AnnotationShape;
  scale: number;
  onDeselect: () => void;
  onUpdate: (updates: Partial<AnnotationShape>) => void;
  onDelete: () => void;
}

function ShapeSelectionFrame({
  shape,
  scale,
  onDeselect,
  onUpdate,
  onDelete,
}: ShapeSelectionFrameProps) {
  const moveRef = useRef<{
    startX: number;
    startY: number;
    initialStartX: number;
    initialStartY: number;
    initialEndX: number;
    initialEndY: number;
  } | null>(null);

  const resizeRef = useRef<{
    corner: "tl" | "tr" | "bl" | "br";
    clientX: number;
    clientY: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    initialStartX: number;
    initialStartY: number;
    initialEndX: number;
    initialEndY: number;
  } | null>(null);

  const minX = Math.min(shape.startX, shape.endX);
  const minY = Math.min(shape.startY, shape.endY);
  const maxX = Math.max(shape.startX, shape.endX);
  const maxY = Math.max(shape.startY, shape.endY);
  const width = Math.max(16, maxX - minX);
  const height = Math.max(16, maxY - minY);

  const screenLeft = Math.round(minX * scale);
  const screenTop = Math.round(minY * scale);
  const screenWidth = Math.round(width * scale);
  const screenHeight = Math.round(height * scale);

  // Move drag interaction
  const handleMoveStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    moveRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialStartX: shape.startX,
      initialStartY: shape.startY,
      initialEndX: shape.endX,
      initialEndY: shape.endY,
    };
  };

  const handleMoveMove = (e: React.PointerEvent) => {
    if (!moveRef.current) return;
    const dx = (e.clientX - moveRef.current.startX) / scale;
    const dy = (e.clientY - moveRef.current.startY) / scale;
    onUpdate({
      startX: Math.round(moveRef.current.initialStartX + dx),
      startY: Math.round(moveRef.current.initialStartY + dy),
      endX: Math.round(moveRef.current.initialEndX + dx),
      endY: Math.round(moveRef.current.initialEndY + dy),
    });
  };

  const handleMoveEnd = (e: React.PointerEvent) => {
    if (!moveRef.current) return;
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    moveRef.current = null;
  };

  // Corner resize interaction
  const handleResizeStart = (corner: "tl" | "tr" | "bl" | "br", e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    resizeRef.current = {
      corner,
      clientX: e.clientX,
      clientY: e.clientY,
      minX,
      minY,
      maxX,
      maxY,
      initialStartX: shape.startX,
      initialStartY: shape.startY,
      initialEndX: shape.endX,
      initialEndY: shape.endY,
    };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const { corner, clientX, clientY, minX: rMinX, minY: rMinY, maxX: rMaxX, maxY: rMaxY, initialStartX, initialStartY, initialEndX, initialEndY } = resizeRef.current;
    const dx = (e.clientX - clientX) / scale;
    const dy = (e.clientY - clientY) / scale;

    let newMinX = rMinX;
    let newMaxX = rMaxX;
    let newMinY = rMinY;
    let newMaxY = rMaxY;

    if (corner === "br") {
      newMaxX = Math.max(rMinX + 16, rMaxX + dx);
      newMaxY = Math.max(rMinY + 16, rMaxY + dy);
    } else if (corner === "bl") {
      newMinX = Math.min(rMaxX - 16, rMinX + dx);
      newMaxY = Math.max(rMinY + 16, rMaxY + dy);
    } else if (corner === "tr") {
      newMaxX = Math.max(rMinX + 16, rMaxX + dx);
      newMinY = Math.min(rMaxY - 16, rMinY + dy);
    } else if (corner === "tl") {
      newMinX = Math.min(rMaxX - 16, rMinX + dx);
      newMinY = Math.min(rMaxY - 16, rMinY + dy);
    }

    const oldW = rMaxX - rMinX || 1;
    const oldH = rMaxY - rMinY || 1;
    const newW = newMaxX - newMinX;
    const newH = newMaxY - newMinY;

    const startXNorm = (initialStartX - rMinX) / oldW;
    const startYNorm = (initialStartY - rMinY) / oldH;
    const endXNorm = (initialEndX - rMinX) / oldW;
    const endYNorm = (initialEndY - rMinY) / oldH;

    onUpdate({
      startX: Math.round(newMinX + startXNorm * newW),
      startY: Math.round(newMinY + startYNorm * newH),
      endX: Math.round(newMinX + endXNorm * newW),
      endY: Math.round(newMinY + endYNorm * newH),
    });
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

  return (
    <div
      style={{
        position: "absolute",
        left: `${screenLeft}px`,
        top: `${screenTop}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
      }}
      className="shape-selection-frame pointer-events-none select-none z-30"
    >
      {/* Dashed Selection Bounding Frame with High-Contrast Halo */}
      <div className="absolute inset-0 border-2 border-dashed border-[#2563EB] dark:border-[#3B82F6] ring-1 ring-white/90 dark:ring-stone-900/90 rounded-xs pointer-events-none shadow-[0_0_0_1px_rgba(37,99,235,0.3)]" />

      {/* Top Floating Action Bar */}
      <div className="print:hidden absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-0.5 rounded-md bg-[#2D2926] dark:bg-[#FAF8F5] text-white dark:text-[#21201E] text-[11px] shadow-md z-40 select-none pointer-events-auto">
        {/* Move handle */}
        <div
          onPointerDown={handleMoveStart}
          onPointerMove={handleMoveMove}
          onPointerUp={handleMoveEnd}
          onPointerCancel={handleMoveEnd}
          className="flex items-center gap-1 cursor-move hover:opacity-80 py-0.5"
          title="Click and drag to move shape"
        >
          <Move className="w-3 h-3" />
          <span className="font-medium text-[10px] tracking-wide uppercase">Move</span>
        </div>

        {/* Size indicator & Done / Delete buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] opacity-75 font-mono">
            {Math.round(width)}×{Math.round(height)}pt
          </span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
            title="Delete shape"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDeselect();
            }}
            className="p-1 rounded hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
            title="Deselect shape"
          >
            <Check className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 4 Corner Resize Anchors (High-Contrast Dual-Tone Squares) */}
      <div
        onPointerDown={(e) => handleResizeStart("tl", e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className="print:hidden absolute -top-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize pointer-events-auto z-40"
        title="Drag to resize"
      >
        <div className="w-3.5 h-3.5 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.45)] hover:scale-125 transition-transform" />
      </div>

      <div
        onPointerDown={(e) => handleResizeStart("tr", e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className="print:hidden absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize pointer-events-auto z-40"
        title="Drag to resize"
      >
        <div className="w-3.5 h-3.5 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.45)] hover:scale-125 transition-transform" />
      </div>

      <div
        onPointerDown={(e) => handleResizeStart("bl", e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className="print:hidden absolute -bottom-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize pointer-events-auto z-40"
        title="Drag to resize"
      >
        <div className="w-3.5 h-3.5 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.45)] hover:scale-125 transition-transform" />
      </div>

      <div
        onPointerDown={(e) => handleResizeStart("br", e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        className="print:hidden absolute -bottom-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize pointer-events-auto z-40"
        title="Drag to resize"
      >
        <div className="w-3.5 h-3.5 rounded-xs bg-[#2563EB] dark:bg-[#3B82F6] border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.45)] hover:scale-125 transition-transform" />
      </div>
    </div>
  );
}
