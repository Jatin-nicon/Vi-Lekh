import { parse, parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { isHtmlDocument } from "@/lib/layout/document-html";

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

/** Elements the viewer adds to the rendered page; they are not in the source. */
const APP_NODES = "[data-vl-page-spacer], [data-vl-overlay], [data-vl-comment]";
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

/** Child-index path of `el` below `root`, ignoring elements the viewer added. */
export function renderedPath(el: Element, root: Element): number[] | null {
  const path: number[] = [];
  let node: Element | null = el;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return null;
    const siblings = Array.from(parent.children).filter((c) => !c.matches(APP_NODES));
    const i = siblings.indexOf(node);
    if (i < 0) return null;
    path.unshift(i);
    node = parent;
  }
  return node === root ? path : null;
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

export function insertAfter(html: string, el: P5Element, markup: string): string {
  const end = el.sourceCodeLocation?.endOffset;
  if (end === undefined) throw new Error("No source location.");
  return html.slice(0, end) + "\n" + markup + html.slice(end);
}
