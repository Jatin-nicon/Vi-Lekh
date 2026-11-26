"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import type { AnnotationTool, ShapeType } from "./annotation-toolbar";
import { COLOR_PALETTE } from "./annotation-toolbar";
import { Trash2, Check, Move } from "lucide-react";
import {
  annotationStorageKey,
  legacyAnnotationKey,
  type AnnotationKind,
  type AnnotationLayout,
} from "@/lib/annotations/storage-keys";
import { loadTextStyle, type TextBoxFont } from "@/lib/annotations/text-style";
import { NOTE_HAND, ensureNoteFonts } from "@/lib/layout/note-fonts";
import { openLink, splitLinks } from "@/lib/layout/links";

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
  /** Typeface. Boxes saved before this existed have none and stay sans. */
  font?: TextBoxFont;
}

export interface AnnotationLayerProps {
  noteId: string;
  pageNumber?: number;
  /** Storage key family for per-page annotations. Defaults to "pdf". */
  layout?: AnnotationLayout;
  scale?: number;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  renderedWidth?: number;
  renderedHeight?: number;
  tool: AnnotationTool | null;
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
  onRecordSnapshot?: (snapshot: {
    strokes: AnnotationStroke[];
    shapes: AnnotationShape[];
    textBoxes: AnnotationTextBox[];
  }) => void;
  className?: string;
}

export function isShapeTool(tool: AnnotationTool | null): tool is ShapeType {
  if (!tool) return false;
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

export const ERASER_RADIUS = 14;

/**
 * Calculates squared Euclidean distance from point (px, py) to line segment (ax, ay)-(bx, by).
 */
export function pointToSegmentDistanceSquared(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx;
  const qy = ay + t * dy;
  const ex = px - qx;
  const ey = py - qy;
  return ex * ex + ey * ey;
}

/**
 * Determines whether an annotation stroke intersects with an eraser circle at (px, py) with radius r.
 * Uses AABB bounding box pre-filtering followed by segment distance testing.
 */
export function isStrokeIntersectingPoint(
  stroke: AnnotationStroke,
  px: number,
  py: number,
  radius: number = ERASER_RADIUS
): boolean {
  if (!stroke.points || stroke.points.length === 0) return false;

  const effectiveRadius = radius + (stroke.width || 2) / 2;
  const effRadSq = effectiveRadius * effectiveRadius;

  // AABB pre-filtering
  let minX = stroke.points[0].x;
  let maxX = stroke.points[0].x;
  let minY = stroke.points[0].y;
  let maxY = stroke.points[0].y;

  for (let i = 1; i < stroke.points.length; i++) {
    const pt = stroke.points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  if (
    px + effectiveRadius < minX ||
    px - effectiveRadius > maxX ||
    py + effectiveRadius < minY ||
    py - effectiveRadius > maxY
  ) {
    return false;
  }

  // Single point stroke test
  if (stroke.points.length === 1) {
    const dx = px - stroke.points[0].x;
    const dy = py - stroke.points[0].y;
    return dx * dx + dy * dy <= effRadSq;
  }

  // Segment tests
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    if (pointToSegmentDistanceSquared(px, py, p1.x, p1.y, p2.x, p2.y) <= effRadSq) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether a geometric shape intersects with an eraser circle at (px, py) with radius r.
 */
export function isShapeIntersectingPoint(
  shape: AnnotationShape,
  px: number,
  py: number,
  radius: number = ERASER_RADIUS
): boolean {
  const minX = Math.min(shape.startX, shape.endX);
  const maxX = Math.max(shape.startX, shape.endX);
  const minY = Math.min(shape.startY, shape.endY);
  const maxY = Math.max(shape.startY, shape.endY);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const strokeWidth = shape.width || 2;
  const effRad = radius + strokeWidth / 2;
  const effRadSq = effRad * effRad;

  // AABB pre-filtering
  if (
    px + effRad < minX ||
    px - effRad > maxX ||
    py + effRad < minY ||
    py - effRad > maxY
  ) {
    return false;
  }

  if (shape.type === "line") {
    return pointToSegmentDistanceSquared(px, py, shape.startX, shape.startY, shape.endX, shape.endY) <= effRadSq;
  }

  if (shape.type === "arrow") {
    // Check main shaft
    if (pointToSegmentDistanceSquared(px, py, shape.startX, shape.startY, shape.endX, shape.endY) <= effRadSq) {
      return true;
    }
    // Also check arrowhead endpoint buffer
    const headDistanceSq = (px - shape.endX) * (px - shape.endX) + (py - shape.endY) * (py - shape.endY);
    return headDistanceSq <= (effRad + 14) * (effRad + 14);
  }

  if (shape.type === "circle") {
    // Ellipse hit test with radius margin
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = width / 2 + effRad;
    const ry = height / 2 + effRad;
    const normalizedDist =
      Math.pow(px - cx, 2) / Math.pow(rx, 2) + Math.pow(py - cy, 2) / Math.pow(ry, 2);
    return normalizedDist <= 1.0;
  }

  // Rectangle, star, cloud: test distance from (px, py) to the shape bounding rectangle
  const closestX = Math.max(minX, Math.min(maxX, px));
  const closestY = Math.max(minY, Math.min(maxY, py));
  const dx = px - closestX;
  const dy = py - closestY;
  return dx * dx + dy * dy <= effRadSq;
}

/**
 * Determines whether an annotation text box intersects with an eraser circle at (px, py) with radius r.
 */
export function isTextBoxIntersectingPoint(
  box: AnnotationTextBox,
  px: number,
  py: number,
  radius: number = ERASER_RADIUS
): boolean {
  const boxWidth = box.width || 220;
  const fontSize = box.fontSize || 14;
  const lineCount = (box.text || "").split("\n").length;
  const boxHeight = box.height || Math.max(36, lineCount * (fontSize * 1.4) + 20);

  const minX = box.x;
  const maxX = box.x + boxWidth;
  const minY = box.y;
  const maxY = box.y + boxHeight;

  // AABB test
  if (
    px + radius < minX ||
    px - radius > maxX ||
    py + radius < minY ||
    py - radius > maxY
  ) {
    return false;
  }

  // Distance from point to box rectangle
  const closestX = Math.max(minX, Math.min(maxX, px));
  const closestY = Math.max(minY, Math.min(maxY, py));
  const dx = px - closestX;
  const dy = py - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

export function getAnnotationCursor(tool: AnnotationTool | null, color: string): string {
  if (!tool) return "default";
  const encodedColor = (color || "#A85D44").replace("#", "%23");

  if (tool === "pen") {
    // High-contrast dual-tone reticle with active ink color in center
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='6' fill='none' stroke='white' stroke-width='3.5' opacity='0.95'/><circle cx='12' cy='12' r='6' fill='none' stroke='%2318181B' stroke-width='1.5'/><circle cx='12' cy='12' r='2.5' fill='${encodedColor}' stroke='white' stroke-width='0.8'/></svg>`;
    return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
  }

  if (tool === "highlighter") {
    // High-contrast highlighter reticle with wider stroke ring and translucent center
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='8' fill='none' stroke='white' stroke-width='3.5' opacity='0.95'/><circle cx='12' cy='12' r='8' fill='none' stroke='%2318181B' stroke-width='1.5'/><circle cx='12' cy='12' r='4' fill='${encodedColor}' fill-opacity='0.6' stroke='white' stroke-width='0.8'/></svg>`;
    return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
  }

  if (tool === "text") {
    // High-contrast dual-tone I-beam (visible on light, dark, and colored slides)
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M8 3h8M12 3v18M8 21h8' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M8 3h8M12 3v18M8 21h8' stroke='%2318181B' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
    return `url("data:image/svg+xml,${svg}") 12 11, text`;
  }

  if (tool === "eraser") {
    // High-contrast dual-tone eraser icon with red accent
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' fill='%23F87171' fill-opacity='0.3' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'/><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21' fill='none' stroke='%23EF4444' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/><path d='M22 21H7' stroke='white' stroke-width='3.5' stroke-linecap='round'/><path d='M22 21H7' stroke='%2318181B' stroke-width='1.5' stroke-linecap='round'/></svg>`;
    return `url("data:image/svg+xml,${svg}") 6 18, pointer`;
  }

  if (isShapeTool(tool) || tool === "underline") {
    // High-contrast dual-tone crosshair with precision center dot
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><path d='M12 2v20M2 12h20' stroke='white' stroke-width='3.5' stroke-linecap='round'/><path d='M12 2v20M2 12h20' stroke='%2318181B' stroke-width='1.5' stroke-linecap='round'/><circle cx='12' cy='12' r='2' fill='white'/><circle cx='12' cy='12' r='1' fill='%2318181B'/></svg>`;
    return `url("data:image/svg+xml,${svg}") 12 12, crosshair`;
  }

  return "default";
}

export function AnnotationLayer({
  noteId,
  pageNumber,
  layout = "pdf",
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
  onRecordSnapshot,
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
  const storageKey = (kind: AnnotationKind) =>
    pageNumber !== undefined
      ? annotationStorageKey(layout, kind, noteId, pageNumber)
      : legacyAnnotationKey(kind, noteId);
  const strokesStorageKey = storageKey("annotations");
  const textStorageKey = storageKey("textboxes");
  const shapesStorageKey = storageKey("shapes");
  // Only the PDF layout falls back to the old single-layer keys on page 1.
  // html-a4 coordinates are page units, so old free-width marks are not shown.
  const useLegacyFallback = layout === "pdf" && pageNumber === 1;

  // Keep latest callback references without triggering effect re-executions
  const onChangeStrokesRef = useRef(onChangeStrokes);
  const setTextBoxesRef = useRef(setTextBoxes);
  const setShapesRef = useRef(setShapes);
  useEffect(() => {
    onChangeStrokesRef.current = onChangeStrokes;
    setTextBoxesRef.current = setTextBoxes;
    setShapesRef.current = setShapes;
  });

  // Keep latest annotation objects in refs to avoid stale closures during high-frequency drag sweeps
  const strokesRef = useRef(strokes);
  const shapesRef = useRef(shapes);
  const textBoxesRef = useRef(textBoxes);
  strokesRef.current = strokes;
  shapesRef.current = shapes;
  textBoxesRef.current = textBoxes;
  useEffect(() => {
    strokesRef.current = strokes;
    shapesRef.current = shapes;
    textBoxesRef.current = textBoxes;
  });

  // Active eraser sweep point for visual reticle
  const [eraserSweepPoint, setEraserSweepPoint] = useState<AnnotationPoint | null>(null);
  const isErasingRef = useRef(false);
  const hasErasedDuringGestureRef = useRef(false);
  const lastEraserPointRef = useRef<AnnotationPoint | null>(null);

  const onRecordSnapshotRef = useRef(onRecordSnapshot);
  useEffect(() => {
    onRecordSnapshotRef.current = onRecordSnapshot;
  });

  // Snapshot taken before drawing or erasing gesture starts
  const snapshotBeforeGestureRef = useRef<{
    strokes: AnnotationStroke[];
    shapes: AnnotationShape[];
    textBoxes: AnnotationTextBox[];
  } | null>(null);

  // Track initial load per note and page so localStorage read runs exactly once
  const initializedKeyRef = useRef<string>("");

  // Restore strokes, text boxes, and shapes from localStorage on mount or page switch
  useEffect(() => {
    if (!noteId || typeof window === "undefined") return;

    const currentKey = `${noteId}_${strokesStorageKey}_${textStorageKey}_${shapesStorageKey}`;
    if (initializedKeyRef.current === currentKey) return;
    initializedKeyRef.current = currentKey;

    try {
      const savedStrokes =
        localStorage.getItem(strokesStorageKey) ||
        (useLegacyFallback ? localStorage.getItem(legacyAnnotationKey("annotations", noteId)) : null);
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
      const savedTextBoxes =
        localStorage.getItem(textStorageKey) ||
        (useLegacyFallback ? localStorage.getItem(legacyAnnotationKey("textboxes", noteId)) : null);
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
      const savedShapes =
        localStorage.getItem(shapesStorageKey) ||
        (useLegacyFallback ? localStorage.getItem(legacyAnnotationKey("shapes", noteId)) : null);
      if (savedShapes) {
        const parsed = JSON.parse(savedShapes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setShapesRef.current(parsed);
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, [noteId, strokesStorageKey, textStorageKey, shapesStorageKey, useLegacyFallback]);

  // Save strokes to localStorage
  const updateStrokes = useCallback(
    (newStrokes: AnnotationStroke[]) => {
      strokesRef.current = newStrokes;
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
      textBoxesRef.current = newBoxes;
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
      shapesRef.current = newShapes;
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

  // Reset active eraser drag state when switching tools
  useEffect(() => {
    if (tool !== "eraser") {
      isErasingRef.current = false;
      lastEraserPointRef.current = null;
      setEraserSweepPoint(null);
    }
  }, [tool]);

  // Continuous eraser sweep: checks intersection against strokes, shapes, and text boxes
  const performEraseAt = useCallback(
    (pt: AnnotationPoint) => {
      // 1. Strokes
      const currentStrokes = strokesRef.current;
      const filteredStrokes = currentStrokes.filter(
        (s) => !isStrokeIntersectingPoint(s, pt.x, pt.y, ERASER_RADIUS)
      );
      if (filteredStrokes.length !== currentStrokes.length) {
        hasErasedDuringGestureRef.current = true;
        strokesRef.current = filteredStrokes;
        updateStrokes(filteredStrokes);
      }

      // 2. Shapes
      const currentShapes = shapesRef.current;
      const filteredShapes = currentShapes.filter(
        (s) => !isShapeIntersectingPoint(s, pt.x, pt.y, ERASER_RADIUS)
      );
      if (filteredShapes.length !== currentShapes.length) {
        hasErasedDuringGestureRef.current = true;
        shapesRef.current = filteredShapes;
        updateShapes(filteredShapes);
        if (activeShapeId && !filteredShapes.some((s) => s.id === activeShapeId)) {
          setActiveShapeId(null);
        }
      }

      // 3. Text Boxes
      const currentBoxes = textBoxesRef.current;
      const filteredBoxes = currentBoxes.filter(
        (b) => !isTextBoxIntersectingPoint(b, pt.x, pt.y, ERASER_RADIUS)
      );
      if (filteredBoxes.length !== currentBoxes.length) {
        hasErasedDuringGestureRef.current = true;
        textBoxesRef.current = filteredBoxes;
        updateTextBoxes(filteredBoxes);
        if (activeTextId && !filteredBoxes.some((b) => b.id === activeTextId)) {
          setActiveTextId(null);
        }
      }
    },
    [activeShapeId, activeTextId, setActiveShapeId, setActiveTextId, updateShapes, updateStrokes, updateTextBoxes]
  );

  const sweepEraseBetween = useCallback(
    (startPt: AnnotationPoint, endPt: AnnotationPoint) => {
      const dist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
      const steps = Math.max(1, Math.ceil(dist / 8));
      for (let i = 1; i <= steps; i++) {
        const sampleX = startPt.x + (endPt.x - startPt.x) * (i / steps);
        const sampleY = startPt.y + (endPt.y - startPt.y) * (i / steps);
        performEraseAt({ x: sampleX, y: sampleY });
      }
    },
    [performEraseAt]
  );

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
        onRecordSnapshotRef.current?.({
          strokes: [...strokesRef.current],
          shapes: [...shapesRef.current],
          textBoxes: [...textBoxesRef.current],
        });
        updateTextBoxes(textBoxes.filter((b) => b.id !== activeTextId));
        setActiveTextId(null);
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [textBoxes, activeTextId, updateTextBoxes]);

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
  const isDrawingTool = tool !== null && (tool === "pen" || tool === "highlighter" || tool === "underline" || isShape);

  // Two-finger pan & pinch gesture tracking to scroll/zoom without accidental drawing
  const isTwoFingerActiveRef = useRef(false);
  const touchStateRef = useRef<{
    prevMidX: number;
    prevMidY: number;
    prevDist: number;
  } | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        isTwoFingerActiveRef.current = true;
        setIsDrawing(false);
        setCurrentStroke(null);
        setPreviewShape(null);

        // If accidental erasing happened right before second finger touched, restore prior state
        if (hasErasedDuringGestureRef.current && snapshotBeforeGestureRef.current) {
          updateStrokes(snapshotBeforeGestureRef.current.strokes);
          updateShapes(snapshotBeforeGestureRef.current.shapes);
          updateTextBoxes(snapshotBeforeGestureRef.current.textBoxes);
          snapshotBeforeGestureRef.current = null;
          hasErasedDuringGestureRef.current = false;
        }
        isErasingRef.current = false;
        lastEraserPointRef.current = null;
        setEraserSweepPoint(null);

        try {
          for (let i = 0; i < e.touches.length; i++) {
            svgEl.releasePointerCapture(e.touches[i].identifier);
          }
        } catch {
          // Ignore
        }

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        touchStateRef.current = {
          prevMidX: midX,
          prevMidY: midY,
          prevDist: dist,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        if (e.cancelable) {
          e.preventDefault();
        }

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentMidX = (t1.clientX + t2.clientX) / 2;
        const currentMidY = (t1.clientY + t2.clientY) / 2;
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        if (touchStateRef.current) {
          const deltaX = currentMidX - touchStateRef.current.prevMidX;
          const deltaY = currentMidY - touchStateRef.current.prevMidY;

          // Two-finger scroll: pan window smoothly
          if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
            (containerRef.current?.closest("[data-reader-scroller]") ?? window).scrollBy(-deltaX, -deltaY);
          }

          // Two-finger pinch: zoom PDF scale
          if (touchStateRef.current.prevDist > 10 && currentDist > 10) {
            const distRatio = currentDist / touchStateRef.current.prevDist;
            if (Math.abs(distRatio - 1) > 0.008) {
              window.dispatchEvent(
                new CustomEvent("vilekh-pdf-zoom", {
                  detail: { scaleFactor: distRatio },
                })
              );
            }
          }
        }

        touchStateRef.current = {
          prevMidX: currentMidX,
          prevMidY: currentMidY,
          prevDist: currentDist,
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStateRef.current = null;
      }
      if (e.touches.length === 0) {
        setTimeout(() => {
          isTwoFingerActiveRef.current = false;
        }, 60);
      }
    };

    svgEl.addEventListener("touchstart", handleTouchStart, { passive: false });
    svgEl.addEventListener("touchmove", handleTouchMove, { passive: false });
    svgEl.addEventListener("touchend", handleTouchEnd, { passive: true });
    svgEl.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      svgEl.removeEventListener("touchstart", handleTouchStart);
      svgEl.removeEventListener("touchmove", handleTouchMove);
      svgEl.removeEventListener("touchend", handleTouchEnd);
      svgEl.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [updateStrokes, updateShapes, updateTextBoxes]);

  // Global pointerup listener to ensure any drag gesture outside SVG completes safely
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isErasingRef.current) {
        isErasingRef.current = false;
        lastEraserPointRef.current = null;
        setEraserSweepPoint(null);
        if (hasErasedDuringGestureRef.current && snapshotBeforeGestureRef.current) {
          onRecordSnapshotRef.current?.(snapshotBeforeGestureRef.current);
        }
        snapshotBeforeGestureRef.current = null;
        hasErasedDuringGestureRef.current = false;
      }
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  // 3. SVG Pointer event handlers for drawing, shapes, and drag-to-erase
  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // If a two-finger gesture is in progress or was just active, ignore pointerdown
    if (isTwoFingerActiveRef.current) return;

    // Record deep snapshot of annotations before any gesture begins
    snapshotBeforeGestureRef.current = {
      strokes: JSON.parse(JSON.stringify(strokesRef.current)),
      shapes: JSON.parse(JSON.stringify(shapesRef.current)),
      textBoxes: JSON.parse(JSON.stringify(textBoxesRef.current)),
    };
    hasErasedDuringGestureRef.current = false;

    if (tool === "eraser") {
      try {
        (svgRef.current || e.currentTarget).setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      isErasingRef.current = true;
      const pt = getPoint(e);
      lastEraserPointRef.current = pt;
      setEraserSweepPoint(pt);
      performEraseAt(pt);
      return;
    }

    if (!isDrawingTool) return;

    try {
      (svgRef.current || e.currentTarget).setPointerCapture(e.pointerId);
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
    if (isTwoFingerActiveRef.current) return;

    if (isErasingRef.current) {
      const pt = getPoint(e);
      setEraserSweepPoint(pt);
      if (lastEraserPointRef.current) {
        sweepEraseBetween(lastEraserPointRef.current, pt);
      } else {
        performEraseAt(pt);
      }
      lastEraserPointRef.current = pt;
      return;
    }

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
    if (isTwoFingerActiveRef.current) {
      try {
        (svgRef.current || e.currentTarget).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setIsDrawing(false);
      setCurrentStroke(null);
      setPreviewShape(null);
      return;
    }

    if (isErasingRef.current) {
      try {
        (svgRef.current || e.currentTarget).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      isErasingRef.current = false;
      lastEraserPointRef.current = null;
      setEraserSweepPoint(null);

      // Record snapshot if any annotations were erased during this gesture
      if (hasErasedDuringGestureRef.current && snapshotBeforeGestureRef.current) {
        onRecordSnapshotRef.current?.(snapshotBeforeGestureRef.current);
      }
      snapshotBeforeGestureRef.current = null;
      hasErasedDuringGestureRef.current = false;
      return;
    }

    if (!isDrawing) return;

    try {
      (svgRef.current || e.currentTarget).releasePointerCapture(e.pointerId);
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
        if (snapshotBeforeGestureRef.current) {
          onRecordSnapshotRef.current?.(snapshotBeforeGestureRef.current);
          snapshotBeforeGestureRef.current = null;
        }
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
        updateShapes([...shapesRef.current, newShape]);
        setActiveShapeId(newShape.id);
      }
      setPreviewShape(null);
      return;
    }

    if (currentStroke && currentStroke.points.length > 0) {
      if (snapshotBeforeGestureRef.current) {
        onRecordSnapshotRef.current?.(snapshotBeforeGestureRef.current);
        snapshotBeforeGestureRef.current = null;
      }
      updateStrokes([...strokesRef.current, currentStroke]);
    }
    setCurrentStroke(null);
  };

  // Erase individual stroke
  const handleDeleteStroke = (strokeId: string) => {
    if (tool === "eraser") {
      onRecordSnapshotRef.current?.({
        strokes: [...strokesRef.current],
        shapes: [...shapesRef.current],
        textBoxes: [...textBoxesRef.current],
      });
      updateStrokes(strokesRef.current.filter((s) => s.id !== strokeId));
    }
  };

  // Erase individual shape
  const handleDeleteShape = (shapeId: string) => {
    onRecordSnapshotRef.current?.({
      strokes: [...strokesRef.current],
      shapes: [...shapesRef.current],
      textBoxes: [...textBoxesRef.current],
    });
    updateShapes(shapesRef.current.filter((s) => s.id !== shapeId));
    if (activeShapeId === shapeId) {
      setActiveShapeId(null);
    }
  };

  const handleUpdateShape = (shapeId: string, updates: Partial<AnnotationShape>) => {
    const updated = shapesRef.current.map((s) => (s.id === shapeId ? { ...s, ...updates } : s));
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
    const pointerEventsVal = isPreview || isEraser ? "none" : "all";

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

    // Offset by internal container padding (8pt) so typing/cursor starts exactly at the clicked point
    const paddingOffset = 8;
    const rawX = clickX - paddingOffset;
    const rawY = clickY - paddingOffset;

    const defaultWidth = 220;
    const boundedX = Math.max(0, Math.min(effectiveIntrinsicWidth - defaultWidth, Math.round(rawX)));
    const boundedY = Math.max(0, Math.round(rawY));

    const cleanedBoxes = textBoxesRef.current.filter((b) =>
      b.id === activeTextId ? b.text.trim().length > 0 : true
    );

    onRecordSnapshotRef.current?.({
      strokes: [...strokesRef.current],
      shapes: [...shapesRef.current],
      textBoxes: [...textBoxesRef.current],
    });

    const newId = `tb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newBox: AnnotationTextBox = {
      id: newId,
      x: boundedX,
      y: boundedY,
      width: defaultWidth,
      text: "",
      ...loadTextStyle(),
      bold: false,
      italic: false,
      hasBorder: false,
    };

    updateTextBoxes([...cleanedBoxes, newBox]);
    setActiveTextId(newId);
  };

  const handleUpdateTextBox = (id: string, updates: Partial<AnnotationTextBox>) => {
    const updated = textBoxesRef.current.map((b) => (b.id === id ? { ...b, ...updates } : b));
    updateTextBoxes(updated);
  };

  const handleDeleteTextBox = (id: string) => {
    onRecordSnapshotRef.current?.({
      strokes: [...strokesRef.current],
      shapes: [...shapesRef.current],
      textBoxes: [...textBoxesRef.current],
    });
    const updated = textBoxesRef.current.filter((b) => b.id !== id);
    updateTextBoxes(updated);
    if (activeTextId === id) {
      setActiveTextId(null);
    }
  };

  const isInteractive = tool !== null;
  const activeShape = shapes.find((s) => s.id === activeShapeId) || null;
  const annotationCursor = getAnnotationCursor(tool, color);

  return (
    <div
      ref={containerRef}
      onPointerDown={handleContainerPointerDown}
      style={{
        cursor: tool === "text" ? annotationCursor : undefined,
      }}
      className={`absolute inset-0 w-full h-full bg-transparent ${
        isInteractive ? "pointer-events-auto" : "pointer-events-none"
      } ${className}`}
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
          isDrawingTool || tool === "eraser"
            ? "pointer-events-auto"
            : "pointer-events-none"
        }`}
        style={{
          touchAction: isDrawingTool || tool === "eraser" ? "none" : "auto",
          cursor: isDrawingTool || tool === "eraser" ? annotationCursor : "default",
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
                pointerEvents="none"
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
              pointerEvents="none"
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

        {/* Active Eraser Sweep Reticle */}
        {eraserSweepPoint && (
          <g pointerEvents="none">
            {/* Outer high-contrast white ring for dark/colored slides */}
            <circle
              cx={eraserSweepPoint.x}
              cy={eraserSweepPoint.y}
              r={ERASER_RADIUS}
              fill="rgba(239, 68, 68, 0.18)"
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth={3}
            />
            {/* Inner dashed red ring */}
            <circle
              cx={eraserSweepPoint.x}
              cy={eraserSweepPoint.y}
              r={ERASER_RADIUS}
              fill="none"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            {/* Center dot */}
            <circle
              cx={eraserSweepPoint.x}
              cy={eraserSweepPoint.y}
              r={1.5}
              fill="#ef4444"
            />
          </g>
        )}
      </svg>

      {/* Positioned Word/Docs-Style HTML Text Boxes and Shape Selection Frame */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {textBoxes.map((box) => (
          <WordDocsTextBoxItem
            key={box.id}
            box={box}
            scale={currentScale}
            pageWidth={effectiveIntrinsicWidth * currentScale}
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
            pageWidth={effectiveIntrinsicWidth * currentScale}
            onDeselect={() => setActiveShapeId(null)}
            onUpdate={(updates) => handleUpdateShape(activeShape.id, updates)}
            onDelete={() => handleDeleteShape(activeShape.id)}
          />
        )}
      </div>
    </div>
  );
}

const HAND_STACK = `${NOTE_HAND}, cursive`;

interface WordDocsTextBoxItemProps {
  box: AnnotationTextBox;
  scale: number;
  pageWidth?: number;
  tool: AnnotationTool | null;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onUpdate: (updates: Partial<AnnotationTextBox>) => void;
  onDelete: () => void;
}

function WordDocsTextBoxItem({
  box,
  scale,
  pageWidth,
  tool,
  isSelected,
  onSelect,
  onDeselect,
  onUpdate,
  onDelete,
}: WordDocsTextBoxItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isHand = box.font === "hand";

  // Handwriting uses the bundled note font.
  useEffect(() => {
    if (isHand) ensureNoteFonts();
  }, [isHand]);

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
  }, [box.text, isSelected, box.width, scale, box.font, box.fontSize, box.bold]);

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
  const isDrawingTool = tool !== null && (tool === "pen" || tool === "highlighter" || tool === "underline");
  const boxWidth = box.width || 220;

  // Render coordinates scaled to current screen view
  const screenLeft = Math.round(box.x * scale);
  const screenTop = Math.round(box.y * scale);
  const screenWidth = Math.round(boxWidth * scale);

  // Hide empty boxes when deselected and tool is not text
  if (!box.text.trim() && !isSelected && tool !== "text") {
    return null;
  }

  const MIN_TEXT_BAR_WIDTH = 150;
  const isNarrowText = screenWidth < MIN_TEXT_BAR_WIDTH;
  const idealTextLeft = isNarrowText ? Math.round((screenWidth - MIN_TEXT_BAR_WIDTH) / 2) : 0;
  const textBarLeft = pageWidth
    ? Math.max(4 - screenLeft, Math.min(pageWidth - screenLeft - MIN_TEXT_BAR_WIDTH - 4, idealTextLeft))
    : idealTextLeft;

  return (
    <div
      style={{
        position: "absolute",
        left: `${screenLeft}px`,
        top: `${screenTop}px`,
        width: `${screenWidth}px`,
      }}
      className={`annotation-text-box select-none transition-shadow ${
        isDrawingTool || isEraser || tool === null
          ? isSelected
            ? "pointer-events-auto z-30"
            : "pointer-events-none z-10"
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
          <div
            style={{
              position: "absolute",
              top: "-32px",
              ...(isNarrowText
                ? {
                    left: `${textBarLeft}px`,
                    width: `${MIN_TEXT_BAR_WIDTH}px`,
                  }
                : {
                    left: 0,
                    right: 0,
                  }),
            }}
            className="print:hidden flex items-center justify-between px-2 py-0.5 rounded-md bg-[#2D2926] dark:bg-[#FAF8F5] text-white dark:text-[#21201E] text-[11px] shadow-md z-40 select-none"
          >
            {/* Drag frame handle */}
            <div
              onPointerDown={handleFrameDragStart}
              onPointerMove={handleFrameDragMove}
              onPointerUp={handleFrameDragEnd}
              onPointerCancel={handleFrameDragEnd}
              className="flex items-center gap-1 cursor-move hover:opacity-80 py-0.5 shrink-0"
              title="Click and drag to move text box"
            >
              <Move className="w-3 h-3" />
              <span className="font-medium text-[10px] tracking-wide uppercase">Move</span>
            </div>

            {/* Size indicator & Done/Delete buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] opacity-75 font-mono whitespace-nowrap">{boxWidth}pt</span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 rounded hover:bg-red-600 hover:text-white transition-colors cursor-pointer shrink-0"
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
                className="p-1 rounded hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer shrink-0"
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
            <span>Click or drag to delete</span>
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
              ...(isHand ? { fontFamily: HAND_STACK, lineHeight: 1.35 } : null),
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
              ...(isHand ? { fontFamily: HAND_STACK, lineHeight: 1.35 } : null),
            }}
          >
            {splitLinks(box.text).map((part, i) =>
              part.href ? (
                <a
                  key={i}
                  href={part.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openLink(part.href!);
                  }}
                  className="pointer-events-auto underline underline-offset-2 cursor-pointer hover:opacity-80"
                  title={`Open ${part.href} in a new tab`}
                >
                  {part.text}
                </a>
              ) : (
                <React.Fragment key={i}>{part.text}</React.Fragment>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ShapeSelectionFrameProps {
  shape: AnnotationShape;
  scale: number;
  pageWidth?: number;
  onDeselect: () => void;
  onUpdate: (updates: Partial<AnnotationShape>) => void;
  onDelete: () => void;
}

function ShapeSelectionFrame({
  shape,
  scale,
  pageWidth,
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

  const MIN_ACTION_BAR_WIDTH = 168;
  const isNarrow = screenWidth < MIN_ACTION_BAR_WIDTH;
  const idealBarLeft = isNarrow ? Math.round((screenWidth - MIN_ACTION_BAR_WIDTH) / 2) : 0;
  const barLeft = pageWidth
    ? Math.max(4 - screenLeft, Math.min(pageWidth - screenLeft - MIN_ACTION_BAR_WIDTH - 4, idealBarLeft))
    : idealBarLeft;

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
      <div
        style={{
          position: "absolute",
          top: "-32px",
          ...(isNarrow
            ? {
                left: `${barLeft}px`,
                width: `${MIN_ACTION_BAR_WIDTH}px`,
              }
            : {
                left: 0,
                right: 0,
              }),
        }}
        className="print:hidden flex items-center justify-between px-2 py-0.5 rounded-md bg-[#2D2926] dark:bg-[#FAF8F5] text-white dark:text-[#21201E] text-[11px] shadow-md z-40 select-none pointer-events-auto"
      >
        {/* Move handle */}
        <div
          onPointerDown={handleMoveStart}
          onPointerMove={handleMoveMove}
          onPointerUp={handleMoveEnd}
          onPointerCancel={handleMoveEnd}
          className="flex items-center gap-1 cursor-move hover:opacity-80 py-0.5 shrink-0"
          title="Click and drag to move shape"
        >
          <Move className="w-3 h-3" />
          <span className="font-medium text-[10px] tracking-wide uppercase">Move</span>
        </div>

        {/* Size indicator & Done / Delete buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] opacity-75 font-mono whitespace-nowrap">
            {Math.round(width)}×{Math.round(height)}pt
          </span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-red-600 hover:text-white transition-colors cursor-pointer shrink-0"
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
            className="p-1 rounded hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer shrink-0"
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
