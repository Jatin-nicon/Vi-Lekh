import { parse, parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { isHtmlDocument } from "@/lib/layout/document-html";
import { APP_NODES, renderedPath } from "@/lib/editor/dom-path";

export { renderedPath };

/**
 * Maps an element of the rendered note back to its place in the note's HTML
 * source, and splices edits into the source by offset so every other
 * character stays as it was (design D1, D2).
 */

type P5Node = DefaultTreeAdapterMap["node"];
type P5Element = DefaultTreeAdapterMap["element"];
type P5Parent = DefaultTreeAdapterMap["parentNode"];

export interface SourceTree {
  html: string;
  /** `body` for complete documents, the fragment root otherwise. */
  root: P5Parent;
  isDocument: boolean;
}

/** Elements the document viewer removes from a document's body before showing it. */
const REMOVED_IN_DOCUMENTS = new Set(["style", "script", "link", "meta", "title", "base", "noscript"]);

const isElement = (n: P5Node): n is P5Element => "tagName" in n && typeof (n as P5Element).tagName === "string";

export function parseSource(html: string): SourceTree {
  const opts = { sourceCodeLocationInfo: true } as const;
  if (isHtmlDocument(html)) {
    const doc = parse(html, opts);
    const htmlEl = doc.childNodes.find((n) => isElement(n) && n.tagName === "html") as P5Element | undefined;
    const body = htmlEl?.childNodes.find((n) => isElement(n) && n.tagName === "body") as P5Element | undefined;
    if (!body) throw new Error("The document has no body.");
    return { html, root: body, isDocument: true };
  }
  // The viewer places a fragment inside a <div>; parse it in the same context.
  const context = (parse("<div></div>").childNodes[0] as P5Element).childNodes[1] as P5Element;
  const fragment = parseFragment(context.childNodes[0] as P5Element, html, opts);
  return { html, root: fragment, isDocument: false };
}

function sourceChildren(parent: P5Parent, isDocument: boolean): P5Element[] {
  const kids = "content" in parent && parent.tagName === "template" ? (parent as DefaultTreeAdapterMap["template"]).content.childNodes : parent.childNodes;
  return kids.filter((n): n is P5Element => isElement(n) && !(isDocument && REMOVED_IN_DOCUMENTS.has(n.tagName)));
}

export function resolvePath(tree: SourceTree, path: number[]): P5Element | null {
  let node: P5Parent = tree.root;
  let el: P5Element | null = null;
  for (const i of path) {
    const kids = sourceChildren(node, tree.isDocument);
    el = kids[i] ?? null;
    if (!el) return null;
    node = el;
  }
  return el;
}

/** Visible text of a source element, whitespace-collapsed. */
export function sourceText(el: P5Element): string {
  let out = "";
  const walk = (n: P5Node) => {
    if (n.nodeName === "#text") out += (n as DefaultTreeAdapterMap["textNode"]).value;
    else if (isElement(n) && !["script", "style"].includes(n.tagName)) n.childNodes.forEach(walk);
  };
  walk(el);
  return out.replace(/\s+/g, " ").trim();
}

/** Rendered text of an element, ignoring viewer-added nodes and form values. */
export function renderedText(el: Element): string {
  let out = "";
  const walk = (n: Node) => {
    if (n.nodeType === 3) out += n.textContent ?? "";
    else if (n.nodeType === 1 && !(n as Element).matches(APP_NODES) && !["SCRIPT", "STYLE"].includes((n as Element).tagName)) n.childNodes.forEach(walk);
    else if (n.nodeType === 1 && (n as Element).matches("[data-vl-comment]")) n.childNodes.forEach(walk);
  };
  walk(el);
  return out.replace(/\s+/g, " ").trim();
}

export type Located = { ok: true; element: P5Element; path: number[] } | { ok: false; reason: string };

/** Finds the source element for a rendered one; refuses unless tag and text match. */
export function locate(tree: SourceTree, el: Element, root: Element): Located {
  const path = renderedPath(el, root);
  if (!path) return { ok: false, reason: "not-in-note" };
  const element = resolvePath(tree, path);
  if (!element) return { ok: false, reason: "no-source" };
  if (element.tagName !== el.tagName.toLowerCase()) return { ok: false, reason: "tag-mismatch" };
  if (sourceText(element) !== renderedText(el)) return { ok: false, reason: "text-mismatch" };
  return { ok: true, element, path };
}

/**
 * Finds the source element for a block that was checked when editing began:
 * by its path, its tag and its text before editing (the page may since show
 * the edited text).
 */
export function locateEdited(tree: SourceTree, path: number[], tagName: string, textBefore: string): Located {
  const element = resolvePath(tree, path);
  if (!element) return { ok: false, reason: "no-source" };
  if (element.tagName !== tagName.toLowerCase()) return { ok: false, reason: "tag-mismatch" };
  if (sourceText(element) !== textBefore.replace(/\s+/g, " ").trim()) return { ok: false, reason: "text-mismatch" };
  return { ok: true, element, path };
}

/** Source offsets of an element's inner HTML. */
export function innerRange(el: P5Element): { start: number; end: number } {
  const loc = el.sourceCodeLocation;
  if (!loc?.startTag) throw new Error("No source location.");
  const start = loc.startTag.endOffset;
  // Elements whose end tag is implied (</p>, </li>) end where their content ends.
  const end = loc.endTag ? loc.endTag.startOffset : loc.endOffset;
  return { start, end };
}

export function replaceInner(html: string, el: P5Element, inner: string): string {
  const { start, end } = innerRange(el);
  return html.slice(0, start) + inner + html.slice(end);
}

/** Inserts markup on a new line after an element (so removing it again restores the source exactly). */
export function insertAfter(html: string, el: P5Element, markup: string): string {
  const end = el.sourceCodeLocation?.endOffset;
  if (end === undefined) throw new Error("No source location.");
  return html.slice(0, end) + "\n" + markup.replace(/\s+$/, "") + html.slice(end);
}

/**
 * Removes an element from the source (design D10). When it starts its own
 * line, the line break and indentation before it go too, so no blank line
 * is left behind.
 */
export function removeElement(html: string, el: P5Element): string {
  const loc = el.sourceCodeLocation;
  if (!loc) throw new Error("No source location.");
  let start = loc.startOffset;
  let i = start;
  while (i > 0 && (html[i - 1] === " " || html[i - 1] === "\t")) i--;
  if (html[i - 1] === "\n") start = html[i - 2] === "\r" ? i - 2 : i - 1;
  return html.slice(0, start) + html.slice(loc.endOffset);
}

const escapeAttr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * Sets (or with null, removes) one CSS property in an element's start-tag
 * `style`, keeping its other declarations and attributes as written
 * (design D11). Everything outside the start tag stays the same.
 */
export function setStartTagStyle(html: string, el: P5Element, property: string, value: string | null): string {
  const loc = el.sourceCodeLocation;
  if (!loc?.startTag) throw new Error("No source location.");
  const current = el.attrs.find((a) => a.name === "style")?.value ?? "";
  const kept = current
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d && d.split(":")[0].trim().toLowerCase() !== property.toLowerCase());
  if (value) kept.push(`${property}: ${value}`);
  const style = kept.join("; ");
  const attrLoc = loc.attrs?.style;
  if (attrLoc) {
    if (style) return html.slice(0, attrLoc.startOffset) + `style="${escapeAttr(style)}"` + html.slice(attrLoc.endOffset);
    let start = attrLoc.startOffset;
    while (start > loc.startTag.startOffset && /\s/.test(html[start - 1])) start--;
    return html.slice(0, start) + html.slice(attrLoc.endOffset);
  }
  if (!style) return html;
  const tagEnd = loc.startTag.endOffset;
  const at = html[tagEnd - 2] === "/" ? tagEnd - 2 : tagEnd - 1;
  return html.slice(0, at) + ` style="${escapeAttr(style)}"` + html.slice(at);
}

/**
 * Inserts markup after the last element of the note's content (the body for
 * documents, the fragment root otherwise), or as its only content when it has
 * none (design D4). Returns the new draft and the new element's path.
 */
export function insertAtEnd(tree: SourceTree, markup: string): { html: string; path: number[] } {
  const kids = sourceChildren(tree.root, tree.isDocument);
  const last = kids[kids.length - 1];
  if (last) return { html: insertAfter(tree.html, last, markup), path: [kids.length] };
  const html = tree.html;
  const clean = markup.replace(/\s+$/, "");
  const loc = (tree.root as P5Element).sourceCodeLocation;
  const at = tree.isDocument ? (loc?.startTag?.endOffset ?? loc?.endTag?.startOffset ?? html.length) : html.length;
  return { html: html.slice(0, at) + "\n" + clean + html.slice(at), path: [0] };
}

/** Tags the block type menu can switch between (design D12). */
export const RENAMABLE = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6"]);

/**
 * Changes an element's tag name in its start and end tags, keeping its
 * attributes and content as written (design D12). Refuses elements outside
 * {@link RENAMABLE} and elements whose end tag is implied.
 */
export function renameElement(html: string, el: P5Element, tagName: string): string {
  const loc = el.sourceCodeLocation;
  const to = tagName.toLowerCase();
  if (!RENAMABLE.has(el.tagName) || !RENAMABLE.has(to)) throw new Error("Only paragraphs and headings can change type.");
  if (!loc?.startTag || !loc.endTag) throw new Error("This part can't change type on the page.");
  const n = el.tagName.length;
  const end = loc.endTag.startOffset + 2; // after "</"
  const start = loc.startTag.startOffset + 1; // after "<"
  return html.slice(0, start) + to + html.slice(start + n, end) + to + html.slice(end + n);
}
