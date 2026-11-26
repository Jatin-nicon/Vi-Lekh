import { diffArrays } from "diff";
import { isInlineOnly } from "./inline-clean";

/**
 * Marks which text blocks changed between two rendered versions of a note,
 * for the before/after review screen (design D9). Works on the rendered DOM,
 * so it is as fine-grained as a paragraph even inside large sections.
 */

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "DT", "DD", "BLOCKQUOTE", "FIGCAPTION", "CAPTION", "SUMMARY", "PRE", "IMG", "FIGURE"]);

export const DIFF_ATTR = "data-vl-change";
export type BlockChange = "added" | "removed" | "changed";

/** Text blocks in reading order, each with a comparison key. */
export function textBlocks(root: Element): { el: Element; key: string }[] {
  const out: { el: Element; key: string }[] = [];
  const visit = (el: Element) => {
    if (el.matches("svg, style, script, [data-vl-page-spacer], [data-vl-overlay]")) return;
    const isBlock = BLOCK_TAGS.has(el.tagName) || (el.children.length === 0 && (el.textContent ?? "").trim() !== "") || (el.tagName === "DIV" && (el.textContent ?? "").trim() !== "" && isInlineOnly(el));
    if (isBlock) {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const key = el.tagName === "IMG" ? `img:${el.getAttribute("src")?.slice(0, 200)}` : `${el.tagName}:${text}`;
      out.push({ el, key });
      return;
    }
    Array.from(el.children).forEach(visit);
  };
  Array.from(root.children).forEach(visit);
  return out;
}

/** Marks blocks on both sides; returns the number of changes. */
export function markChanges(before: Element, after: Element): number {
  for (const el of [...Array.from(before.querySelectorAll(`[${DIFF_ATTR}]`)), ...Array.from(after.querySelectorAll(`[${DIFF_ATTR}]`))]) el.removeAttribute(DIFF_ATTR);
  const a = textBlocks(before), b = textBlocks(after);
  let i = 0, j = 0, count = 0;
  const parts = diffArrays(a.map((x) => x.key), b.map((x) => x.key));
  for (let k = 0; k < parts.length; k++) {
    const part = parts[k];
    const n = part.count ?? part.value.length;
    if (!part.added && !part.removed) {
      i += n;
      j += n;
      continue;
    }
    const next = parts[k + 1];
    if (part.removed && next?.added) {
      // A run of removed blocks followed by added ones: pair them up as changes.
      const m = next.count ?? next.value.length;
      for (let x = 0; x < Math.max(n, m); x++) {
        if (x < n && x < m) {
          a[i + x].el.setAttribute(DIFF_ATTR, "changed");
          b[j + x].el.setAttribute(DIFF_ATTR, "changed");
        } else if (x < n) a[i + x].el.setAttribute(DIFF_ATTR, "removed");
        else b[j + x].el.setAttribute(DIFF_ATTR, "added");
        count++;
      }
      i += n;
      j += m;
      k++;
      continue;
    }
    for (let x = 0; x < n; x++) {
      if (part.removed) a[i + x].el.setAttribute(DIFF_ATTR, "removed");
      else b[j + x].el.setAttribute(DIFF_ATTR, "added");
      count++;
    }
    if (part.removed) i += n;
    else j += n;
  }
  return count;
}

export const CHANGE_CSS = `
  [${DIFF_ATTR}] { border-radius: 3px; outline-offset: 2px; }
  [${DIFF_ATTR}="changed"] { background: rgba(234, 179, 8, 0.22) !important; outline: 2px solid rgba(202, 138, 4, 0.7); }
  [${DIFF_ATTR}="added"] { background: rgba(16, 185, 129, 0.18) !important; outline: 2px solid rgba(5, 150, 105, 0.7); }
  [${DIFF_ATTR}="removed"] { background: rgba(239, 68, 68, 0.14) !important; outline: 2px solid rgba(220, 38, 38, 0.6); text-decoration: line-through; }
`;
