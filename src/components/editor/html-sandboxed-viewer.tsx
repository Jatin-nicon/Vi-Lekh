"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import {
  NOTE_BODY_STACK,
  NOTE_HEADING_STACK,
  NOTE_MONO_STACK,
  ensureNoteFonts,
  loadNoteFonts,
} from "@/lib/layout/note-fonts";
import { DOCUMENT_WIDTH, isHtmlDocument, prepareDocument } from "@/lib/layout/document-html";
import { bindFormFields } from "@/lib/layout/form-fields";
import { bindLinks } from "@/lib/layout/links";
import { findBlock, startEditing, type EditSession } from "@/lib/editor/page-editing";
import { renderedPath } from "@/lib/editor/source-map";
import {
  PAGE_GAP,
  PAGE_HEIGHT,
  PAGE_MARGIN,
  PAGE_PITCH,
  PAGE_WIDTH,
  paginate,
} from "@/lib/layout/paginate";

export interface PagedLayoutInfo {
  pageCount: number;
  /** Screen pixels per page unit: fit-to-width × zoom. */
  scale: number;
  /** Size of each page in page units. A complete document is one tall page. */
  pageWidth: number;
  pageHeight: number;
}

interface HtmlSandboxedViewerProps {
  html: string;
  className?: string;
  theme?: "light" | "dark";
  /**
   * Lay the note out on fixed A4 pages (794 × 1123 page units) scaled to fit
   * the available width (design D1). Line and page breaks then depend only on
   * the content, never on the screen size or zoom.
   */
  paged?: boolean;
  /** User zoom multiplier applied on top of fit-to-width (paged mode). */
  zoom?: number;
  /** Called after each pagination pass and whenever the scale changes. */
  onLayout?: (info: PagedLayoutInfo) => void;
  /**
   * Renders content over page `pageIndex` (0-based), e.g. an annotation layer.
   * The overlay box is pageWidth × pageHeight × scale screen pixels.
   */
  renderPageOverlay?: (pageIndex: number, info: PagedLayoutInfo) => React.ReactNode;
  /** Storage key for the note's fill-in fields. Without it they are read-only. */
  fieldsKey?: string;
  /** Turns on editing on the page (suggest mode, design D3). */
  editing?: PageEditing;
}

/** Callbacks for editing on the page; `root` is the note's content root in the shadow DOM. */
export interface PageEditing {
  /** Whether a block can be edited (its source can be found). */
  canEdit: (element: Element, root: Element) => boolean;
  /** A block's edited inner HTML, already cleaned, with its inner HTML before editing. */
  onCommit: (element: Element, root: Element, innerHtml: string, originalHtml: string) => void;
  /** The block being edited, or null; for the "Add after this" toolbar. */
  onSelect?: (selection: { element: Element; root: Element } | null) => void;
  /** A click on text that can't be edited on the page. */
  onUneditable?: (info: { element: Element; root: Element; text: string }) => void;
  /** A block to open for editing after the next render (e.g. a section just inserted). */
  takeFocusPath?: () => number[] | null;
}

const BASE_SANDBOX_CSS = `
  :host {
    display: block;
    width: 100%;
    color: var(--foreground, #2D2926);
    font-family: ${NOTE_BODY_STACK};
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }

  .sandbox-container {
    width: 100%;
    color: inherit;
    container-type: inline-size;
  }

  /* Default Typography */
  h1, h2, h3, h4, h5, h6 {
    color: inherit;
    font-family: ${NOTE_HEADING_STACK};
    font-weight: 700;
    line-height: 1.3;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
  h4 { font-size: 1.1rem; }
  p {
    margin-top: 0;
    margin-bottom: 1.25rem;
    line-height: 1.75;
  }
  a {
    color: #A85D44;
    text-decoration: underline;
  }
  ul, ol {
    margin: 1rem 0 1.25rem 1.5rem;
    padding: 0;
  }
  li {
    margin-bottom: 0.35rem;
  }
  blockquote {
    margin: 1.25rem 0;
    padding-left: 1rem;
    border-left: 3px solid #E8E3D9;
    color: #757069;
    font-style: italic;
  }
  code {
    font-family: ${NOTE_MONO_STACK};
    font-size: 0.9em;
    background-color: rgba(120, 110, 100, 0.08);
    padding: 0.15em 0.35em;
    border-radius: 4px;
  }
  pre {
    font-family: ${NOTE_MONO_STACK};
    background-color: #21201E;
    color: #FAF8F5;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.25rem 0;
  }
  pre code {
    background-color: transparent;
    padding: 0;
    color: inherit;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.9rem;
  }
  th, td {
    padding: 0.65rem 0.85rem;
    border: 1px solid #E8E3D9;
    text-align: left;
  }
  th {
    background-color: rgba(120, 110, 100, 0.08);
    font-weight: 600;
  }
  img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }

  /* Educational Callouts */
  .callout {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    margin: 1.5rem 0;
    border: 1px solid #E8E3D9;
    background-color: #F7F4EB;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .callout-icon {
    font-size: 1.2rem;
    line-height: 1.3;
    flex-shrink: 0;
  }
  .callout-body {
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  /* Pinned Note / Mantra */
  .pinned-note {
    margin: 1.75rem 0;
    border-radius: 0.875rem;
    background-color: #FEF9E7;
    border: 1px solid #F6E05E;
    padding: 1.25rem;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pinned-header {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #975A16;
    margin-bottom: 0.5rem;
  }
  .pinned-content {
    font-size: 0.9375rem;
    font-style: italic;
    line-height: 1.6;
  }

  /* Concept Cards Grid */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin: 1.75rem 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .concept-card {
    border-radius: 0.75rem;
    border: 1px solid #E8E3D9;
    background-color: #FAF8F5;
    padding: 1rem 1.25rem;
  }
  .concept-card.card-danger {
    border-color: #FEB2B2;
    background-color: #FFF5F5;
  }
  .concept-card.card-success {
    border-color: #C6F6D5;
    background-color: #F0FFF4;
  }
  .concept-card.card-exercise {
    border-style: dashed;
    border-color: #CBD5E0;
    background-color: #F7FAFC;
  }
  .concept-card h4 {
    margin: 0.25rem 0 0.5rem 0;
    font-size: 0.95rem;
  }
  .concept-card p {
    font-size: 0.85rem;
    margin-bottom: 0;
  }

  /* Process Flow Steps */
  .process-flow {
    margin: 1.75rem 0;
    padding: 1.25rem;
    border-radius: 0.875rem;
    border: 1px solid #E8E3D9;
    background-color: #FAF8F5;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .process-flow h4 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }
  .flow-steps {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  @container (min-width: 640px) {
    .flow-steps {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .flow-step {
      flex: 1;
      min-width: 140px;
    }
  }
  .flow-step {
    border-radius: 0.625rem;
    border: 1px solid #E8E3D9;
    background-color: #FFFFFF;
    padding: 0.875rem;
  }
  .flow-step.highlighted {
    background-color: #FEF9E7;
    border-color: #F6E05E;
  }
  .flow-step strong {
    display: block;
    font-size: 0.85rem;
    margin: 0.25rem 0;
  }
  .flow-step p {
    font-size: 0.78rem;
    color: #757069;
    margin: 0;
  }

  /* Worksheet Reflection Note */
  .your-note {
    margin: 1.75rem 0;
    padding: 1.25rem;
    border-radius: 0.875rem;
    border: 1px solid #E8E3D9;
    background-color: #FAF8F5;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .note-header {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #5D7063;
    margin-bottom: 0.5rem;
  }
  .note-prompt {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  .rule-lines {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .rule-line {
    border-bottom: 1px dashed #D5CEBF;
    height: 1.25rem;
  }

  /* Contribution sections (Case Study, My Experience, Findings) */
  .vl-contribution {
    margin: 1.75rem 0;
    padding: 1.1rem 1.25rem 0.9rem;
    border-radius: 0.875rem;
    border: 1px solid #E8E3D9;
    border-left: 4px solid #5D7063;
    background-color: #FAF8F5;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .vl-contribution.vl-experience { border-left-color: #A85D44; }
  .vl-contribution.vl-findings { border-left-color: #2B6CB0; }
  .vl-contribution > h3:first-child,
  .vl-contribution > h4:first-child {
    margin-top: 0;
    margin-bottom: 0.6rem;
    font-size: 1.05rem;
  }
  .vl-contribution p:last-child,
  .vl-contribution ul:last-child,
  .vl-contribution ol:last-child {
    margin-bottom: 0;
  }
  .vl-contribution[data-contributor-name]:not([data-contributor-name=""])::after {
    content: "Contributed by " attr(data-contributor-name);
    display: block;
    margin-top: 0.75rem;
    font-family: ${NOTE_HEADING_STACK};
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #757069;
  }

  /* Figures inserted with the Image action */
  .vl-figure {
    margin: 1.5rem 0;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .vl-figure img { display: inline-block; }
  .vl-figure figcaption {
    margin-top: 0.4rem;
    font-size: 0.85rem;
    color: #757069;
  }

  /* Dark mode overrides */
  .dark .vl-contribution {
    border-color: #33312E;
    background-color: #1E1C1B;
  }
  .dark .vl-contribution { border-left-color: #768D7D; }
  .dark .vl-contribution.vl-experience { border-left-color: #C4785E; }
  .dark .vl-contribution.vl-findings { border-left-color: #63B3ED; }
  .dark .vl-contribution::after,
  .dark .vl-figure figcaption { color: #948F86; }
  .dark {
    color: #E3DFD7;
  }
  .dark blockquote {
    border-color: #33312E;
    color: #948F86;
  }
  .dark th, .dark td {
    border-color: #33312E;
  }
  .dark th {
    background-color: #292825;
  }
  .dark .callout {
    border-color: #33312E;
    background-color: #1F1E1C;
  }
  .dark .pinned-note {
    background-color: #2A261A;
    border-color: rgba(180, 130, 40, 0.4);
  }
  .dark .concept-card {
    border-color: #33312E;
    background-color: #1E1C1B;
  }
  .dark .process-flow {
    border-color: #33312E;
    background-color: #1E1C1B;
  }
  .dark .flow-step {
    border-color: #33312E;
    background-color: #252321;
  }
  .dark .flow-step.highlighted {
    background-color: #2A261A;
    border-color: rgba(180, 130, 40, 0.4);
  }
  .dark .your-note {
    border-color: #33312E;
    background-color: #1E1C1B;
  }
  .dark .rule-line {
    border-color: #3E3B37;
  }

  /* Print isolation */
  @media print {
    :host {
      color: #000000 !important;
      background: transparent !important;
    }
    .sandbox-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #000000 !important;
      break-after: avoid;
      page-break-after: avoid;
    }
    .callout, .pinned-note, .concept-card, .process-flow, .your-note, .katex-display, .vl-contribution, .vl-figure {
      break-inside: avoid;
      page-break-inside: avoid;
      box-shadow: none !important;
    }
  }
`;

/** `rem` follows the browser's root font size; paged mode pins it to 16px. */
const SANDBOX_CSS = BASE_SANDBOX_CSS.replace(/(\d*\.?\d+)rem\b/g, "calc($1 * var(--vl-rem, 1rem))");

const PAGED_CSS = `
  :host { display: block; }
  .vl-pages {
    position: relative;
    width: ${PAGE_WIDTH}px;
  }
  .vl-sheet {
    position: absolute;
    left: 0;
    width: ${PAGE_WIDTH}px;
    height: ${PAGE_HEIGHT}px;
    background: #FFFFFF;
    border: 1px solid #E8E3D9;
    box-sizing: border-box;
    box-shadow: 0 1px 3px rgba(45, 41, 38, 0.08);
  }
  .vl-pages.dark .vl-sheet {
    background: #1E1D1B;
    border-color: #33312E;
  }
  .vl-flow {
    --vl-rem: 16px;
    position: relative;
    box-sizing: border-box;
    width: var(--vl-w, ${PAGE_WIDTH}px);
    padding: var(--vl-pt, ${PAGE_MARGIN}px) var(--vl-pr, ${PAGE_MARGIN}px) var(--vl-pb, ${PAGE_MARGIN}px) var(--vl-pl, ${PAGE_MARGIN}px);
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    overflow-wrap: break-word;
  }
  .vl-flow > :first-child { margin-top: 0; }
  .vl-edit-mode :is(p, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, blockquote, figcaption, caption, summary) { cursor: text; }
  .vl-edit-mode :is(p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption):hover:not([data-vl-editing]) { outline: 1px dashed rgba(37, 99, 235, 0.45); outline-offset: 2px; }
  [data-vl-editing] { outline: 2px solid #2563EB !important; outline-offset: 2px; border-radius: 2px; background: rgba(37, 99, 235, 0.05); }
  [data-vl-overlay] a:hover { opacity: 0.8; }
  /* Page geometry must not change in print, or breaks would move (design D4). */
  @media print {
    .vl-flow.sandbox-container {
      width: var(--vl-w, ${PAGE_WIDTH}px) !important;
      max-width: none !important;
      margin: 0 !important;
      padding: var(--vl-pt, ${PAGE_MARGIN}px) var(--vl-pr, ${PAGE_MARGIN}px) var(--vl-pb, ${PAGE_MARGIN}px) var(--vl-pl, ${PAGE_MARGIN}px) !important;
    }
  }
`;

const KATEX_CSS_URL = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";

/**
 * Click-to-edit on the rendered page: one block at a time, committed when
 * editing moves elsewhere. Returns a cleanup function.
 */
function bindPageEditing(
  flow: HTMLElement,
  isDocument: boolean,
  editingRef: React.MutableRefObject<PageEditing | undefined>,
  resumeRef: React.MutableRefObject<number[] | null>,
): () => void {
  const root = (isDocument ? flow.querySelector<HTMLElement>(".vl-doc") : flow) ?? flow;
  flow.classList.add("vl-edit-mode");
  let session: EditSession | null = null;

  const finish = () => {
    if (!session) return;
    const s = session;
    session = null;
    const inner = s.finish();
    if (inner !== null) editingRef.current?.onCommit(s.element, root, inner, s.original);
  };
  const open = (el: HTMLElement, caret: "none" | "end" | "all") => {
    session = startEditing(el);
    resumeRef.current = renderedPath(el, root);
    editingRef.current?.onSelect?.({ element: el, root });
    if (caret !== "none") {
      el.focus();
      const sel = (el.getRootNode() as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.() ?? el.ownerDocument.getSelection();
      sel?.selectAllChildren(el);
      if (caret === "end") sel?.collapseToEnd();
    }
  };

  const onDown = (e: PointerEvent) => {
    const target = e.composedPath()[0] as Element;
    if (session && session.element.contains(target)) return;
    const hit = findBlock(target, root);
    resumeRef.current = null;
    finish();
    if (hit.kind === "editable" && editingRef.current?.canEdit(hit.element, root)) {
      open(hit.element, "none");
      return;
    }
    editingRef.current?.onSelect?.(null);
    if (hit.kind !== "none") {
      editingRef.current?.onUneditable?.({ element: hit.element, root, text: (hit.element.textContent ?? "").replace(/\s+/g, " ").trim() });
    }
  };
  const onFocusOut = (e: FocusEvent) => {
    if (!session || e.target !== session.element) return;
    resumeRef.current = null;
    finish();
  };
  // Links and other actions inside the note do nothing while editing.
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element)?.closest?.("a[href]")) e.preventDefault();
  };

  flow.addEventListener("pointerdown", onDown, true);
  flow.addEventListener("focusout", onFocusOut);
  flow.addEventListener("click", onClick, true);

  // Reopen the block that was being edited before the page re-rendered.
  const requested = editingRef.current?.takeFocusPath?.() ?? null;
  const path = requested ?? resumeRef.current;
  if (path) {
    let el: Element | null = root;
    for (const i of path) el = el ? (Array.from(el.children).filter((c) => !c.matches("[data-vl-page-spacer], [data-vl-overlay], [data-vl-comment]"))[i] ?? null) : null;
    if (el && el instanceof HTMLElement && editingRef.current?.canEdit(el, root)) requestAnimationFrame(() => open(el as HTMLElement, requested ? "all" : "end"));
  }

  return () => {
    flow.removeEventListener("pointerdown", onDown, true);
    flow.removeEventListener("focusout", onFocusOut);
    flow.removeEventListener("click", onClick, true);
    // Keep anything typed while the page was re-rendering.
    finish();
  };
}

function isDarkTheme(theme?: "light" | "dark") {
  return (
    theme === "dark" ||
    (!theme && typeof document !== "undefined" && document.documentElement.classList.contains("dark"))
  );
}

export function HtmlSandboxedViewer({
  html,
  className = "",
  theme,
  paged = false,
  zoom = 1,
  onLayout,
  renderPageOverlay,
  fieldsKey,
  editing,
}: HtmlSandboxedViewerProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  // Complete HTML documents are one continuous page at their own width.
  const isDocument = useMemo(() => isHtmlDocument(html || ""), [html]);
  const [documentHeight, setDocumentHeight] = useState(PAGE_HEIGHT);
  const pageWidth = isDocument ? DOCUMENT_WIDTH : PAGE_WIDTH;
  const pageHeight = isDocument ? documentHeight : PAGE_HEIGHT;

  // Track the available width (paged mode). Resizing only changes the scale;
  // it never triggers pagination, so breaks don't move.
  useLayoutEffect(() => {
    if (!paged || !outerRef.current) return;
    const el = outerRef.current;
    const update = () => setFitWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paged]);

  const fit = fitWidth > 0 ? Math.min(1, fitWidth / pageWidth) : 1;
  const scale = paged ? fit * (zoom > 0 ? zoom : 1) : 1;

  const editingRef = useRef(editing);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);
  const isEditing = Boolean(editing);
  /** Block to reopen after the page re-renders (its path in the content). */
  const resumeRef = useRef<number[] | null>(null);
  const onLayoutRef = useRef(onLayout);
  useEffect(() => {
    onLayoutRef.current = onLayout;
  }, [onLayout]);

  useEffect(() => {
    if (paged) onLayoutRef.current?.({ pageCount, scale, pageWidth, pageHeight });
  }, [paged, pageCount, scale, pageWidth, pageHeight]);

  const renderSheets = useCallback((shadow: ShadowRoot, count: number) => {
    const sheets = shadow.querySelector(".vl-sheets");
    const pages = shadow.querySelector<HTMLElement>(".vl-pages");
    if (!sheets || !pages) return;
    sheets.innerHTML = Array.from(
      { length: count },
      (_, i) => `<div class="vl-sheet" data-page="${i + 1}" style="top:${i * PAGE_PITCH}px"></div>`,
    ).join("");
    pages.style.height = `${count * PAGE_PITCH - PAGE_GAP}px`;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Attach Shadow DOM root if not already attached
    if (!shadowRootRef.current) {
      shadowRootRef.current =
        containerRef.current.shadowRoot ||
        containerRef.current.attachShadow({ mode: "open" });
    }

    const shadow = shadowRootRef.current;
    if (!shadow) return;
    ensureNoteFonts();

    // Complete HTML documents are adapted for display only; the stored HTML is untouched.
    const content = isDocument ? prepareDocument(html) : html || "";
    const isDark = !isDocument && isDarkTheme(theme);
    const katexLink = `<link rel="stylesheet" href="${KATEX_CSS_URL}" />`;

    if (!paged) {
      shadow.innerHTML = `
        ${katexLink}
        <style>${SANDBOX_CSS}</style>
        <div class="sandbox-container ${isDark ? "dark" : ""}">
          ${content}
        </div>
      `;
      const plain = bindLinks(shadow.querySelector<HTMLElement>(".sandbox-container")!);
      return plain.cleanup;
    }

    shadow.innerHTML = `
      ${katexLink}
      <style>${SANDBOX_CSS}${PAGED_CSS}</style>
      <div class="vl-pages ${isDark ? "dark" : ""}"${isDocument ? " data-document" : ""}>
        <div class="vl-sheets"></div>
        <div class="vl-flow sandbox-container ${isDark ? "dark" : ""}">${content}</div>
      </div>
    `;

    const flow = shadow.querySelector<HTMLElement>(".vl-flow")!;
    const unbindFields = bindFormFields(flow, fieldsKey);
    const links = isEditing ? { refresh() {}, cleanup() {} } : bindLinks(flow);
    const stopEditing = isEditing ? bindPageEditing(flow, isDocument, editingRef, resumeRef) : () => {};
    let cancelled = false;
    let frame = 0;
    const run = () => {
      if (cancelled) return;
      if (isDocument) {
        setDocumentHeight(flow.offsetHeight);
        setPageCount(1);
      } else {
        const { pageCount: count } = paginate(flow);
        renderSheets(shadow, count);
        setPageCount(count);
      }
      links.refresh();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };

    // Re-run after fonts, images and the KaTeX stylesheet load — never on resize.
    run();
    loadNoteFonts().then(schedule);
    const link = shadow.querySelector("link");
    link?.addEventListener("load", schedule);
    const images = Array.from(flow.querySelectorAll("img"));
    images.forEach((img) => {
      if (!img.complete) img.addEventListener("load", schedule);
    });

    return () => {
      cancelled = true;
      unbindFields();
      links.cleanup();
      stopEditing();
      cancelAnimationFrame(frame);
      link?.removeEventListener("load", schedule);
      images.forEach((img) => img.removeEventListener("load", schedule));
    };
  }, [html, theme, paged, renderSheets, fieldsKey, isDocument, isEditing]);

  if (!paged) {
    return (
      <div
        ref={containerRef}
        className={`html-sandboxed-viewer-host w-full ${className}`}
      />
    );
  }

  const stackHeight = isDocument ? documentHeight : pageCount * PAGE_PITCH - PAGE_GAP;
  const info: PagedLayoutInfo = { pageCount, scale, pageWidth, pageHeight };

  return (
    <div ref={outerRef} className={`html-paged-viewer w-full overflow-x-auto ${className}`}>
      <div
        className="relative mx-auto"
        style={{ width: pageWidth * scale, height: stackHeight * scale }}
      >
        <div
          ref={containerRef}
          className="html-sandboxed-viewer-host absolute left-0 top-0"
          style={{
            width: pageWidth,
            height: stackHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
        {renderPageOverlay &&
          Array.from({ length: pageCount }, (_, i) => (
            <div
              key={i}
              className="vl-page-overlay pointer-events-none absolute left-0"
              data-page={i + 1}
              style={{
                top: i * PAGE_PITCH * scale,
                width: pageWidth * scale,
                height: pageHeight * scale,
              }}
            >
              {renderPageOverlay(i, info)}
            </div>
          ))}
      </div>
    </div>
  );
}
