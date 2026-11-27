import type { CommentAnchor } from "@/lib/data/comments";
import { elementAtPath, renderedPath } from "@/lib/editor/source-map";
import { findBlock } from "@/lib/editor/page-editing";

/**
 * Comment anchors (design D7): a comment remembers the text it was made on
 * (`quote`), a little text around it, and the block's path as a hint. Marks
 * are added to the rendered page only, never to the note's source.
 */

export const CONTEXT_CHARS = 32;
export const MARK_ATTR = "data-vl-comment";
/** Text that isn't part of the note as read: the viewer's spacers and overlays, and KaTeX's hidden MathML copy. */
const SKIP = "[data-vl-page-spacer], [data-vl-overlay], style, script, .katex-mathml";

export const COMMENT_MARK_CSS = `
mark[${MARK_ATTR}] { background: rgba(250, 204, 21, 0.35); color: inherit; border-bottom: 2px solid rgba(202, 138, 4, 0.7); cursor: pointer; padding: 0; }
mark[${MARK_ATTR}][data-vl-active] { background: rgba(250, 204, 21, 0.7); }
`;

/** The note's text under `scope`, with runs of whitespace collapsed, and where each character came from. */
interface TextIndex {
  text: string;
  /** For each character of `text`, its text node and offset. */
  at: { node: Text; offset: number }[];
}

function indexText(scope: Node): TextIndex {
  const at: TextIndex["at"] = [];
  let text = "";
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) =>
      n.nodeType === Node.ELEMENT_NODE && (n as Element).matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType !== Node.TEXT_NODE) continue;
    const node = n as Text;
    for (let i = 0; i < node.data.length; i++) {
      const ch = /\s/.test(node.data[i]) ? " " : node.data[i];
      if (ch === " " && (text === "" || text.endsWith(" "))) continue;
      text += ch;
      at.push({ node, offset: i });
    }
  }
  return { text, at };
}

const squash = (s: string) => s.replace(/\s+/g, " ");

/** Position in the index of a DOM boundary point (the first character at or after it). */
function positionOf(index: TextIndex, container: Node, offset: number): number {
  const probe = document.createRange();
  probe.setStart(container, offset);
  for (let i = 0; i < index.at.length; i++) {
    const { node, offset: o } = index.at[i];
    if (probe.comparePoint(node, o) >= 0) return i;
  }
  return index.at.length;
}

/** Builds an anchor for a selection made in the rendered note under `root`. */
export function buildAnchor(range: Range, root: Element): CommentAnchor | null {
  const index = indexText(root);
  let start = positionOf(index, range.startContainer, range.startOffset);
  let end = positionOf(index, range.endContainer, range.endOffset);
  while (start < end && index.text[start] === " ") start++;
  while (end > start && index.text[end - 1] === " ") end--;
  if (start >= end) return null;
  const startEl = index.at[start].node.parentElement;
  const hit = findBlock(startEl, root);
  const path = hit.kind === "none" ? null : renderedPath(hit.element, root);
  return {
    quote: index.text.slice(start, end),
    prefix: index.text.slice(Math.max(0, start - CONTEXT_CHARS), start),
    suffix: index.text.slice(end, end + CONTEXT_CHARS),
    ...(path ? { path } : {}),
  };
}

/** Builds an anchor for a whole block (the block picker). */
export function blockAnchor(block: Element, root: Element): CommentAnchor | null {
  const range = document.createRange();
  range.selectNodeContents(block);
  return buildAnchor(range, root);
}

/** How many characters of the saved prefix and suffix match the text around position `i`. */
function score(text: string, i: number, quote: string, anchor: CommentAnchor): number {
  const before = text.slice(0, i);
  const after = text.slice(i + quote.length);
  const prefix = anchor.prefix ?? "";
  const suffix = anchor.suffix ?? "";
  let s = 0;
  while (s < prefix.length && before[before.length - 1 - s] === prefix[prefix.length - 1 - s]) s++;
  let t = 0;
  while (t < suffix.length && after[t] === suffix[t]) t++;
  return s + t;
}

function search(scope: Element, anchor: CommentAnchor): Range | null {
  const index = indexText(scope);
  const quote = squash(anchor.quote).trim();
  if (!quote) return null;
  let best = -1;
  let bestScore = -1;
  for (let i = index.text.indexOf(quote); i >= 0; i = index.text.indexOf(quote, i + 1)) {
    const s = score(index.text, i, quote, anchor);
    if (s > bestScore) {
      best = i;
      bestScore = s;
    }
  }
  if (best < 0) return null;
  const first = index.at[best];
  const last = index.at[best + quote.length - 1];
  const range = document.createRange();
  range.setStart(first.node, first.offset);
  range.setEnd(last.node, last.offset + 1);
  return range;
}

/**
 * Finds where an anchor is now: in the hinted block first, then anywhere in
 * the note (best match of the text around it). Null when the quoted text is gone.
 */
export function findAnchor(root: Element, anchor: CommentAnchor): Range | null {
  const hinted = anchor.path ? elementAtPath(root, anchor.path) : null;
  return (hinted && search(hinted, anchor)) || search(root, anchor);
}

/** Wraps the text in `range` in marks for a thread. Returns the marks, first to last. */
export function highlight(range: Range, threadId: string): HTMLElement[] {
  const nodes: Text[] = [];
  const container = range.commonAncestorContainer;
  if (container.nodeType === Node.TEXT_NODE) nodes.push(container as Text);
  else {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (range.intersectsNode(n)) nodes.push(n as Text);
  }
  const marks: HTMLElement[] = [];
  for (const node of nodes) {
    if (node.parentElement?.closest(SKIP)) continue;
    let target = node;
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : node.data.length;
    if (from >= to || !node.data.slice(from, to).trim()) continue;
    if (to < target.data.length) target.splitText(to);
    if (from > 0) target = target.splitText(from);
    const mark = document.createElement("mark");
    mark.setAttribute(MARK_ATTR, threadId);
    target.replaceWith(mark);
    mark.appendChild(target);
    marks.push(mark);
  }
  return marks;
}

/** Removes every comment mark under `root`, putting the text back as it was. */
export function clearHighlights(root: ParentNode) {
  for (const mark of Array.from(root.querySelectorAll(`mark[${MARK_ATTR}]`))) {
    const parent = mark.parentNode;
    mark.replaceWith(...Array.from(mark.childNodes));
    parent?.normalize();
  }
}

/** The current selection inside a shadow root, if any (Selection.getComposedRanges where supported). */
export function shadowSelection(shadow: ShadowRoot): Range | null {
  const sel = document.getSelection() as (Selection & { getComposedRanges?: (o: { shadowRoots: ShadowRoot[] }) => StaticRange[] }) | null;
  if (sel?.getComposedRanges) {
    const r = sel.getComposedRanges({ shadowRoots: [shadow] })[0];
    if (!r || r.collapsed || !shadow.contains(r.startContainer)) return null;
    const range = document.createRange();
    range.setStart(r.startContainer, r.startOffset);
    range.setEnd(r.endContainer, r.endOffset);
    return range;
  }
  const legacy = (shadow as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.() ?? sel;
  if (!legacy || legacy.rangeCount === 0 || legacy.isCollapsed) return null;
  const range = legacy.getRangeAt(0);
  return shadow.contains(range.startContainer) ? range : null;
}
