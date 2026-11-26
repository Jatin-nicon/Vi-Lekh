/**
 * Cuts one continuous document into A4-shaped slices for PDF export, between
 * blocks rather than through them.
 */

export interface SliceBox {
  top: number;
  bottom: number;
  /** Headings stay with what follows them. */
  heading?: boolean;
}

export interface Slice {
  top: number;
  height: number;
}

/** Blocks up to this share of a page are never cut. */
const MAX_WHOLE = 0.55;
/** A slice is at least this full; otherwise it is cut where it lands. */
const MIN_FILL = 0.25;

/** `boxes` are in document units; `total` is the document height. */
export function computeSlices(boxes: SliceBox[], total: number, pageHeight: number): Slice[] {
  const whole = boxes.filter((b) => b.bottom - b.top > 0 && b.bottom - b.top <= pageHeight * MAX_WHOLE);
  const content = whole.filter((b) => !b.heading);
  const headings = whole.filter((b) => b.heading);
  const slices: Slice[] = [];
  let top = 0;
  while (total - top > pageHeight + 1) {
    const limit = top + pageHeight;
    const least = top + pageHeight * MIN_FILL;
    let cut = limit;
    for (;;) {
      let next = cut;
      for (const b of whole) if (b.top < cut - 0.5 && b.bottom > cut + 0.5) next = Math.min(next, b.top);
      // A heading with no content between it and the cut moves down with it.
      for (const h of headings) {
        if (h.bottom > cut + 0.5 || h.top < least) continue;
        const followed = content.some((b) => b.top >= h.bottom - 0.5 && b.bottom <= cut + 0.5);
        if (!followed) next = Math.min(next, h.top);
      }
      if (next === cut || next < least) {
        if (next < least && next !== cut) cut = limit;
        break;
      }
      cut = next;
    }
    slices.push({ top, height: cut - top });
    top = cut;
  }
  // Skip a last page that would hold only the document's bottom margin.
  if (slices.length === 0 || whole.some((b) => b.bottom > top + 1)) {
    slices.push({ top, height: Math.max(1, total - top) });
  }
  return slices;
}

/** Measures the blocks of a rendered document, in its own units. */
export function measureBoxes(root: HTMLElement): SliceBox[] {
  const origin = root.getBoundingClientRect();
  const scale = origin.width / (root.offsetWidth || 1) || 1;
  const boxes: SliceBox[] = [];
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") return;
    if (/^(STYLE|SCRIPT|BR)$/.test(el.tagName) || el.closest("[data-vl-overlay]")) return;
    const r = el.getBoundingClientRect();
    if (r.height <= 0 || r.width <= 0) return;
    boxes.push({
      top: (r.top - origin.top) / scale,
      bottom: (r.bottom - origin.top) / scale,
      heading: /^H[1-6]$/.test(el.tagName) || Boolean(el.closest("h1,h2,h3,h4,h5,h6")),
    });
  });
  return boxes;
}
