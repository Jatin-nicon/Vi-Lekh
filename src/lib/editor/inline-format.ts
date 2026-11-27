/**
 * Formatting text inside the block being edited (design D11). Our own range
 * code wraps and unwraps inline tags, instead of `document.execCommand`,
 * so the markup is predictable and survives the clean-up (design D3).
 */

export type InlineFormat = "bold" | "italic" | "underline" | "strike";

/** Tags that count as each format, and the tag we add. */
const FORMATS: Record<InlineFormat, { match: string; tag: string }> = {
  bold: { match: "b, strong", tag: "b" },
  italic: { match: "i, em", tag: "i" },
  underline: { match: "u", tag: "u" },
  strike: { match: "s, strike, del", tag: "s" },
};
const COLOR = "span[style]";
const HIGHLIGHT = "mark[style]";
const ALL_FORMATTING = `b, strong, i, em, u, s, strike, del, ${COLOR}, ${HIGHLIGHT}`;

/** The nearest ancestor of `node` inside `block` matching `selector`. */
function closestWithin(node: Node, selector: string, block: Element): Element | null {
  for (let el = node.parentElement; el && el !== block && block.contains(el); el = el.parentElement) {
    if (el.matches(selector)) return el;
  }
  return null;
}

/** Text nodes inside `block` that the range covers, without changing anything. */
function coveredText(block: Element, range: Range): Text[] {
  const out: Text[] = [];
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    if (!n.data.length || !range.intersectsNode(n)) continue;
    const from = n === range.startContainer ? range.startOffset : 0;
    const to = n === range.endContainer ? range.endOffset : n.data.length;
    if (from < to) out.push(n);
  }
  return out;
}

/** Splits text nodes at the range's ends and returns the text nodes inside it. */
function segments(block: Element, range: Range): Text[] {
  const out: Text[] = [];
  for (const n of coveredText(block, range)) {
    const from = n === range.startContainer ? range.startOffset : 0;
    const to = n === range.endContainer ? range.endOffset : n.data.length;
    let t = n;
    if (to < t.data.length) t.splitText(to);
    if (from > 0) t = t.splitText(from);
    out.push(t);
  }
  return out;
}

const hasContent = (frag: DocumentFragment) => Boolean(frag.textContent || frag.querySelector("br, img"));

/** Splits `ancestor` so that `node` is the only content left in it. */
function isolate(node: Node, ancestor: Element) {
  const doc = ancestor.ownerDocument;
  const before = doc.createRange();
  before.setStart(ancestor, 0);
  before.setEndBefore(node);
  if (!before.collapsed) {
    const frag = before.extractContents();
    if (hasContent(frag)) {
      const copy = ancestor.cloneNode(false) as Element;
      copy.append(frag);
      ancestor.before(copy);
    }
  }
  const after = doc.createRange();
  after.setStartAfter(node);
  after.setEnd(ancestor, ancestor.childNodes.length);
  if (!after.collapsed) {
    const frag = after.extractContents();
    if (hasContent(frag)) {
      const copy = ancestor.cloneNode(false) as Element;
      copy.append(frag);
      ancestor.after(copy);
    }
  }
}

function unwrap(el: Element) {
  el.replaceWith(...Array.from(el.childNodes));
}

/** Removes every `selector` ancestor (inside `block`) from around `node` only. */
function strip(node: Node, selector: string, block: Element) {
  for (let a = closestWithin(node, selector, block); a; a = closestWithin(node, selector, block)) {
    isolate(node, a);
    unwrap(a);
  }
}

const sameTag = (a: Element, b: Element) =>
  a.tagName === b.tagName &&
  a.attributes.length === b.attributes.length &&
  Array.from(a.attributes).every((attr) => b.getAttribute(attr.name) === attr.value);

/** Wraps each node in a new element and joins wrappers that end up side by side. */
function wrapAll(nodes: Node[], make: () => Element) {
  for (const node of nodes) {
    const w = make();
    node.parentNode!.insertBefore(w, node);
    w.appendChild(node);
    let cur: Element = w;
    const prev = w.previousSibling;
    if (prev instanceof Element && sameTag(prev, w)) {
      prev.append(...Array.from(w.childNodes));
      w.remove();
      cur = prev;
    }
    const next = cur.nextSibling;
    if (next instanceof Element && sameTag(next, cur)) {
      cur.append(...Array.from(next.childNodes));
      next.remove();
    }
  }
}

/** A range from the first to the last of `nodes`, to keep them selected. */
function rangeOver(nodes: Text[]): Range | null {
  if (!nodes.length) return null;
  const r = nodes[0].ownerDocument.createRange();
  r.setStart(nodes[0], 0);
  const last = nodes[nodes.length - 1];
  r.setEnd(last, last.data.length);
  return r;
}

/** Turns a format on for the selected text, or off when all of it already has it. Returns the new selection. */
export function toggleFormat(block: Element, range: Range, format: InlineFormat): Range | null {
  const { match, tag } = FORMATS[format];
  const segs = segments(block, range);
  if (!segs.length) return null;
  if (segs.every((t) => closestWithin(t, match, block))) segs.forEach((t) => strip(t, match, block));
  else wrapAll(segs.filter((t) => !closestWithin(t, match, block)), () => block.ownerDocument.createElement(tag));
  return rangeOver(segs);
}

function setStyled(block: Element, range: Range, selector: string, tag: string, property: string, value: string | null): Range | null {
  const segs = segments(block, range);
  segs.forEach((t) => strip(t, selector, block));
  if (value) {
    wrapAll(segs, () => {
      const el = block.ownerDocument.createElement(tag);
      el.setAttribute("style", `${property}: ${value}`);
      return el;
    });
  }
  return rangeOver(segs);
}

/** Colours the selected text with a palette colour, or with null removes its colour. */
export function setTextColor(block: Element, range: Range, color: string | null): Range | null {
  return setStyled(block, range, COLOR, "span", "color", color);
}

/** Highlights the selected text with a palette colour, or with null removes the highlight. */
export function setHighlight(block: Element, range: Range, color: string | null): Range | null {
  return setStyled(block, range, HIGHLIGHT, "mark", "background-color", color);
}

/** Links the selected text (http(s) or mailto only), or with null removes links from it (or the link around the caret). */
export function setLink(block: Element, range: Range, href: string | null): Range | null {
  if (href !== null && !/^(https?:|mailto:)/i.test(href.trim())) throw new Error("Links must start with https://, http:// or mailto:");
  if (range.collapsed) {
    const a = closestWithin(range.startContainer.nodeType === 3 ? range.startContainer : range.startContainer.childNodes[range.startOffset] ?? range.startContainer, "a", block);
    if (href === null && a) unwrap(a);
    return null;
  }
  const segs = segments(block, range);
  segs.forEach((t) => strip(t, "a", block));
  if (href) {
    wrapAll(segs, () => {
      const a = block.ownerDocument.createElement("a");
      a.setAttribute("href", href.trim());
      return a;
    });
  }
  return rangeOver(segs);
}

/** Removes bold, italic, underline, strikethrough, colour and highlight from the selected text (links and the lesson's classes stay). */
export function clearFormatting(block: Element, range: Range): Range | null {
  const segs = segments(block, range);
  segs.forEach((t) => strip(t, ALL_FORMATTING, block));
  return rangeOver(segs);
}

export interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  link: string | null;
  color: string | null;
  highlight: string | null;
}

/** The value of a palette span's or mark's one declaration. */
const styleValue = (el: Element) => el.getAttribute("style")?.split(":").slice(1).join(":").trim() || null;

/** Which formats the selection (or the caret) is in, for the bar's pressed buttons. */
export function activeFormats(block: Element, range: Range): ActiveFormats {
  const nodes: Node[] = range.collapsed ? [range.startContainer] : coveredText(block, range);
  const all = (sel: string) => nodes.length > 0 && nodes.every((n) => (n === block ? false : closestWithin(n, sel, block) !== null || (n instanceof Element && n !== block && n.matches(sel))));
  const value = (sel: string, read: (el: Element) => string | null) => {
    const found = nodes.map((n) => closestWithin(n, sel, block));
    const first = found[0] ? read(found[0]) : null;
    return first && found.every((el) => el && read(el) === first) ? first : null;
  };
  return {
    bold: all(FORMATS.bold.match),
    italic: all(FORMATS.italic.match),
    underline: all(FORMATS.underline.match),
    strike: all(FORMATS.strike.match),
    link: value("a", (el) => el.getAttribute("href")),
    color: value(COLOR, styleValue),
    highlight: value(HIGHLIGHT, styleValue),
  };
}

/** The current selection if it lies inside `block` (which may be in a shadow root). */
export function selectionIn(block: Element): Range | null {
  const rootNode = block.getRootNode();
  const doc = block.ownerDocument;
  const sel = doc.getSelection() as (Selection & { getComposedRanges?: (o: { shadowRoots: ShadowRoot[] }) => StaticRange[] }) | null;
  let range: Range | null = null;
  if (rootNode instanceof ShadowRoot && sel?.getComposedRanges) {
    const r = sel.getComposedRanges({ shadowRoots: [rootNode] })[0];
    if (r) {
      range = doc.createRange();
      range.setStart(r.startContainer, r.startOffset);
      range.setEnd(r.endContainer, r.endOffset);
    }
  } else {
    const s = (rootNode as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.() ?? sel;
    if (s && s.rangeCount) range = s.getRangeAt(0);
  }
  return range && block.contains(range.startContainer) && block.contains(range.endContainer) ? range : null;
}

/** Selects `range` (after formatting, so the same text stays selected). */
export function selectRange(range: Range) {
  const sel = range.startContainer.ownerDocument?.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export type Align = "left" | "center" | "right" | "justify";

/** The block's alignment as shown (its own style, else what the lesson's styles give it). */
export function alignOf(el: HTMLElement): Align {
  const v = getComputedStyle(el).textAlign;
  return v === "center" || v === "right" || v === "justify" ? v : "left";
}

/**
 * Aligns the block being edited. Choosing the alignment the lesson already
 * gives it removes the block's own `text-align` instead of repeating it.
 */
export function setBlockAlign(el: HTMLElement, value: Align): Align {
  el.style.textAlign = "";
  const natural = alignOf(el);
  el.style.textAlign = value === natural ? "" : value;
  if (!el.getAttribute("style")) el.removeAttribute("style");
  return alignOf(el);
}
