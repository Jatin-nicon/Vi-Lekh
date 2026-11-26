/**
 * Fixed A4 page geometry and the pagination pass (design D1).
 *
 * The note is laid out as one continuous flow, 794px wide, over a stack of
 * page sheets. Sheet n starts at y = n × PAGE_PITCH. Content may only occupy
 * [n × PITCH + MARGIN, n × PITCH + PAGE_HEIGHT − MARGIN]. The pass inserts
 * spacers before elements that would cross a sheet's bottom margin, so they
 * start on the next sheet. Elements taller than a page are descended into and
 * split between their children; atomic tall elements (images, code, tables)
 * are left to cross the boundary, like browser print.
 *
 * All measurements use offsetTop/offsetHeight, which ignore CSS transforms, so
 * the result is the same at any screen scale or zoom.
 */

export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
export const PAGE_MARGIN = 72;
/** Visual gap between sheets on screen. Part of the flow coordinate space. */
export const PAGE_GAP = 24;
export const PAGE_PITCH = PAGE_HEIGHT + PAGE_GAP;
export const CONTENT_WIDTH = PAGE_WIDTH - 2 * PAGE_MARGIN;
export const CONTENT_HEIGHT = PAGE_HEIGHT - 2 * PAGE_MARGIN;

export const SPACER_ATTR = "data-vl-page-spacer";

export interface Box {
  top: number;
  height: number;
}

export interface PaginateOptions {
  /** Returns an element's box relative to the flow root. Defaults to offset metrics. */
  measure?: (el: HTMLElement, root: HTMLElement) => Box;
  /** Returns the flow root's total height. Defaults to `root.offsetHeight`. */
  rootHeight?: (root: HTMLElement) => number;
  /** Top and bottom page margins. Default PAGE_MARGIN. */
  margins?: { top: number; bottom: number };
}

export interface PaginateResult {
  pageCount: number;
  spacerCount: number;
}

/** Elements that are never split across pages by descending into children. */
const ATOMIC_TAGS = new Set(["img", "pre", "table", "svg", "video", "canvas", "iframe", "figure", "math"]);
const SKIP_TAGS = new Set(["style", "script", "link", "meta", "template"]);
const HEADING = /^h[1-6]$/;
/** A heading must stay on the same page as this much of a following element too tall to move whole. */
const KEEP_WITH_NEXT = 48;

export function defaultMeasure(el: HTMLElement, root: HTMLElement): Box {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    top += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    // If the root is not the offsetParent chain end, fall back to rects.
    if (!parent || (parent !== root && !root.contains(parent))) {
      const scale = root.getBoundingClientRect().height / (root.offsetHeight || 1) || 1;
      return {
        top: (el.getBoundingClientRect().top - root.getBoundingClientRect().top) / scale,
        height: el.offsetHeight,
      };
    }
    node = parent;
  }
  return { top, height: el.offsetHeight };
}

/** Page index (0-based) whose sheet area contains y. */
export function pageIndexAt(y: number): number {
  return Math.max(0, Math.floor(y / PAGE_PITCH));
}

/** Number of sheets needed for a flow of the given height. */
export function pageCountFor(flowHeight: number, bottomMargin: number = PAGE_MARGIN): number {
  const contentBottom = Math.max(0, flowHeight - bottomMargin);
  return Math.max(1, Math.floor(Math.max(0, contentBottom - 1) / PAGE_PITCH) + 1);
}

/** Removes spacers from a previous pass. */
export function clearPagination(root: HTMLElement): void {
  root.querySelectorAll(`[${SPACER_ATTR}]`).forEach((s) => s.remove());
}

function makeSpacer(doc: Document, parent: Element, height: number): HTMLElement {
  const tag = parent.tagName.toLowerCase();
  const spacer = doc.createElement(tag === "ul" || tag === "ol" ? "li" : "div");
  spacer.setAttribute(SPACER_ATTR, "");
  spacer.setAttribute("aria-hidden", "true");
  spacer.style.cssText = `display:block;height:${height}px;margin:0;padding:0;border:0;list-style:none;break-inside:avoid;`;
  return spacer;
}

/**
 * Runs the pagination pass over `root` (the flow element, whose top edge is
 * the top edge of sheet 0 and which has PAGE_MARGIN top padding).
 * Safe to call repeatedly: previous spacers are removed first.
 */
export function paginate(root: HTMLElement, options: PaginateOptions = {}): PaginateResult {
  const measure = options.measure ?? defaultMeasure;
  const rootHeight = options.rootHeight ?? ((r: HTMLElement) => r.offsetHeight);
  const doc = root.ownerDocument;
  const { top: marginTop, bottom: marginBottom } = options.margins ?? { top: PAGE_MARGIN, bottom: PAGE_MARGIN };
  const contentHeight = PAGE_HEIGHT - marginTop - marginBottom;
  clearPagination(root);
  let spacerCount = 0;

  const keepsWithNext = (el: HTMLElement): boolean => {
    if (HEADING.test(el.tagName.toLowerCase())) return true;
    return /^avoid/.test(doc.defaultView?.getComputedStyle(el).breakAfter ?? "");
  };
  const canSplit = (el: HTMLElement): boolean =>
    /^(section|article|main)$/i.test(el.tagName) &&
    el.children.length > 0 &&
    !el.classList.contains("vl-contribution") &&
    !/^avoid/.test(doc.defaultView?.getComputedStyle(el).breakInside ?? "");
  /** Bottom edge of what must share `el`'s page: itself, plus what it keeps with. */
  const keepBottom = (el: HTMLElement, box: Box): number => {
    let bottom = box.top + box.height;
    let current = el;
    while (keepsWithNext(current)) {
      const next = current.nextElementSibling as HTMLElement | null;
      if (!next || next.hasAttribute(SPACER_ATTR)) break;
      const nb = measure(next, root);
      if (nb.height <= 0) break;
      const whole = nb.top + nb.height;
      // A next element that fits on a page moves whole, so stay with all of it.
      if (whole - box.top > contentHeight) return Math.max(bottom, nb.top + Math.min(nb.height, KEEP_WITH_NEXT));
      bottom = Math.max(bottom, whole);
      current = next;
    }
    return bottom;
  };

  const walk = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (!(child instanceof doc.defaultView!.HTMLElement)) continue;
      const el = child as HTMLElement;
      if (el.hasAttribute(SPACER_ATTR) || el.hasAttribute("data-vl-overlay") || SKIP_TAGS.has(el.tagName.toLowerCase())) continue;

      const box = measure(el, root);
      if (box.height <= 0) continue;
      const page = pageIndexAt(box.top);
      const pageContentTop = page * PAGE_PITCH + marginTop;
      const pageContentBottom = page * PAGE_PITCH + PAGE_HEIGHT - marginBottom;
      const startsInDeadZone = box.top < pageContentTop && page > 0;
      // Headings keep with the start of the next element (no stranded headings).
      const crosses = keepBottom(el, box) > pageContentBottom;
      if (!crosses && !startsInDeadZone) continue;

      // Sectioning containers flow across pages; only their children stay whole.
      if (!startsInDeadZone && canSplit(el)) {
        walk(el);
        continue;
      }

      const fitsOnPage = box.height <= contentHeight;
      if (fitsOnPage || startsInDeadZone) {
        // Starts in a sheet's top margin → move to that sheet's content top.
        // Crosses the bottom margin (and fits on a page) → move to the next sheet.
        const target = startsInDeadZone ? pageContentTop : (page + 1) * PAGE_PITCH + marginTop;
        const spacer = makeSpacer(doc, parent, target - box.top);
        parent.insertBefore(spacer, el);
        spacerCount++;
        // Correct for margin-collapsing changes caused by the spacer.
        const delta = measure(el, root).top - target;
        if (Math.abs(delta) > 0.5) spacer.style.height = `${Math.max(0, target - box.top - delta)}px`;
        if (fitsOnPage) continue;
      }

      // Taller than a page: split between children when possible.
      if (!ATOMIC_TAGS.has(el.tagName.toLowerCase()) && el.children.length > 0) walk(el);
    }
  };

  walk(root);
  return { pageCount: pageCountFor(rootHeight(root), marginBottom), spacerCount };
}
