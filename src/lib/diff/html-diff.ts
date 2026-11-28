import { diffArrays, diffLines, diffWords, type ChangeObject } from "diff";
import { diff3Merge } from "node-diff3";
import { isHtmlDocument } from "@/lib/layout/document-html";

/**
 * Section-level HTML diff and three-way merge (design D8).
 *
 * A note's HTML is split into "segments": its top-level elements, after
 * unwrapping a single generic wrapper element. Segments are normalized
 * (attribute order, whitespace) so cosmetic differences don't count as edits.
 * Diffing and merging work per segment; changed segments get a word diff.
 *
 * Requires a DOM (`DOMParser`), so call it in the browser or under jsdom.
 */

export interface Segment {
  /** `id` / `data-section-id` when present, otherwise a content hash. */
  key: string;
  /** True when the key comes from an explicit id attribute. */
  explicitKey: boolean;
  /** Lowercase tag name, or "#text" for a bare top-level text run. */
  tag: string;
  /** Normalized outerHTML. Two segments are equal iff their html is equal. */
  html: string;
  /** Visible text, whitespace-collapsed. */
  text: string;
  /** True for style/link/script elements that sat outside an unwrapped wrapper. */
  outer?: boolean;
}

export interface ParsedHtml {
  segments: Segment[];
  /** Wrapper elements that were unwrapped, outermost first. */
  wrappers: { open: string; close: string }[];
}

export type SegmentDiffEntry =
  | { type: "unchanged"; base: Segment; proposed: Segment }
  | { type: "added"; proposed: Segment }
  | { type: "removed"; base: Segment }
  | { type: "changed"; base: Segment; proposed: Segment; words: ChangeObject<string>[] };

const UNWRAP_TAGS = new Set(["div", "main", "article", "section", "body"]);
const NON_CONTENT_TAGS = new Set(["style", "link", "script", "meta", "title"]);
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
]);
const WHITESPACE_PRESERVING = new Set(["pre", "textarea", "script", "style"]);

/** Similarity (0..1) at which a removed + added pair is shown as "changed". */
const CHANGED_SIMILARITY = 0.5;

// ---------------------------------------------------------------------------
// Parsing and normalization
// ---------------------------------------------------------------------------

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function openTag(el: Element): string {
  const attrs = Array.from(el.attributes)
    .map((a) => [a.name, a.value] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => (value === "" ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`))
    .join("");
  return `<${el.tagName.toLowerCase()}${attrs}>`;
}

/** Serializes a node with sorted attributes and collapsed whitespace. */
function serialize(node: Node, preserveWs: boolean): string {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    const text = node.textContent ?? "";
    return escapeText(preserveWs ? text : text.replace(/\s+/g, " "));
  }
  if (node.nodeType === 8 /* COMMENT_NODE */) return "";
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (VOID_TAGS.has(tag)) return openTag(el);
  const keepWs = preserveWs || WHITESPACE_PRESERVING.has(tag);
  // Raw-text elements: their content is not markup.
  const inner =
    tag === "style" || tag === "script"
      ? el.textContent ?? ""
      : Array.from((tag === "template" ? (el as HTMLTemplateElement).content : el).childNodes)
          .map((c) => serialize(c, keepWs))
          .join("");
  return `${openTag(el)}${keepWs ? inner : inner.replace(/^ | $/g, "").replace(/> </g, "><")}</${tag}>`;
}

function isSignificant(node: Node): boolean {
  if (node.nodeType === 1) return true;
  if (node.nodeType === 3) return (node.textContent ?? "").trim() !== "";
  return false;
}

function makeSegment(node: Node, outer = false): Segment {
  const html = serialize(node, false).trim();
  const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
  if (node.nodeType !== 1) {
    return { key: `h:${fnv1a(html)}`, explicitKey: false, tag: "#text", html, text, outer };
  }
  const el = node as Element;
  const explicit = el.getAttribute("data-section-id") || el.getAttribute("id");
  return {
    key: explicit ? `id:${explicit}` : `h:${fnv1a(html)}`,
    explicitKey: Boolean(explicit),
    tag: el.tagName.toLowerCase(),
    html,
    text,
    outer: outer || undefined,
  };
}

/** Parses HTML into normalized top-level segments, unwrapping single wrappers. */
export function parseHtml(html: string): ParsedHtml {
  const isDocument = isHtmlDocument(html);
  const doc = new DOMParser().parseFromString(isDocument ? html : `<body>${html ?? ""}</body>`, "text/html");
  let container: Element = doc.body;
  const wrappers: ParsedHtml["wrappers"] = [];
  // A complete document keeps its head (styles, title) as the outermost wrapper.
  if (isDocument) {
    wrappers.push({
      open: `<!doctype html>\n${openTag(doc.documentElement)}${doc.head.outerHTML}${openTag(doc.body)}`,
      close: "</body></html>",
    });
  }
  const outerSegments: Segment[] = [];

  // Unwrap while the container holds exactly one generic wrapper element
  // (ignoring style/script siblings, which are kept as "outer" segments).
  for (;;) {
    const significant = Array.from(container.childNodes).filter(isSignificant);
    const content = significant.filter(
      (n) => !(n.nodeType === 1 && NON_CONTENT_TAGS.has((n as Element).tagName.toLowerCase())),
    );
    if (content.length !== 1 || content[0].nodeType !== 1) break;
    const only = content[0] as Element;
    const tag = only.tagName.toLowerCase();
    if (!UNWRAP_TAGS.has(tag)) break;
    if (only.hasAttribute("id") || only.hasAttribute("data-section-id")) break;
    if (!Array.from(only.childNodes).some((n) => n.nodeType === 1)) break;
    for (const n of significant) if (n !== only) outerSegments.push(makeSegment(n, true));
    wrappers.push({ open: openTag(only), close: `</${tag}>` });
    container = only;
  }

  const segments = Array.from(container.childNodes)
    .filter(isSignificant)
    .map((n) => makeSegment(n));
  return { segments: [...outerSegments, ...segments], wrappers };
}

/** Returns the normalized top-level segments of an HTML document. */
export function segmentHtml(html: string): Segment[] {
  return parseHtml(html).segments;
}

/** Rebuilds HTML from segments, re-applying the given wrappers. */
export function buildHtml(segments: Segment[], wrappers: ParsedHtml["wrappers"] = []): string {
  const outer = segments.filter((s) => s.outer).map((s) => s.html);
  const inner = segments.filter((s) => !s.outer).map((s) => s.html);
  const open = wrappers.map((w) => w.open).join("");
  const close = [...wrappers].reverse().map((w) => w.close).join("");
  // Outer segments of a document go inside its body.
  if (wrappers.length && isHtmlDocument(wrappers[0].open)) {
    const innerOpen = wrappers.slice(1).map((w) => w.open).join("");
    const body = `${innerOpen}${inner.join("\n")}`;
    return `${wrappers[0].open}${outer.join("")}${body}${close}`;
  }
  return [...outer, `${open}${inner.join("\n")}${close}`].filter(Boolean).join("\n");
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

function wordSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wa.size === 0 && wb.size === 0) return 1;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.max(wa.size, wb.size);
}

function isChangedPair(base: Segment, proposed: Segment): boolean {
  if (base.explicitKey || proposed.explicitKey) return base.key === proposed.key;
  if (base.tag !== proposed.tag) return false;
  return wordSimilarity(base.text, proposed.text) >= CHANGED_SIMILARITY;
}

/** Pairs a run of removed segments with a run of added ones, keeping order. */
function pairRuns(removed: Segment[], added: Segment[], out: SegmentDiffEntry[]) {
  let next = 0;
  for (const r of removed) {
    let match = -1;
    for (let j = next; j < added.length; j++) {
      if (isChangedPair(r, added[j])) {
        match = j;
        break;
      }
    }
    if (match === -1) {
      out.push({ type: "removed", base: r });
      continue;
    }
    for (; next < match; next++) out.push({ type: "added", proposed: added[next] });
    out.push({ type: "changed", base: r, proposed: added[match], words: diffWords(r.text, added[match].text) });
    next = match + 1;
  }
  for (; next < added.length; next++) out.push({ type: "added", proposed: added[next] });
}

/** Section-level diff of two HTML documents. */
export function diffSegments(baseHtml: string, proposedHtml: string): SegmentDiffEntry[] {
  const base = segmentHtml(baseHtml);
  const proposed = segmentHtml(proposedHtml);
  const changes = diffArrays(base, proposed, { comparator: (a, b) => a.html === b.html });

  const out: SegmentDiffEntry[] = [];
  let removed: Segment[] = [];
  let added: Segment[] = [];
  const flush = () => {
    if (removed.length || added.length) pairRuns(removed, added, out);
    removed = [];
    added = [];
  };

  // Common items come from `base`; the matching proposed items follow in order.
  let pIndex = 0;
  for (const change of changes) {
    if (change.removed) {
      removed.push(...change.value);
    } else if (change.added) {
      added.push(...change.value);
      pIndex += change.value.length;
    } else {
      flush();
      for (const b of change.value) out.push({ type: "unchanged", base: b, proposed: proposed[pIndex++] });
    }
  }
  flush();
  return out;
}

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "body", "details", "dd", "div", "dl", "dt", "fieldset",
  "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li",
  "main", "nav", "ol", "p", "pre", "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead",
  "tr", "ul", "style", "script", "link", "meta",
]);

function prettyNode(node: Node, depth: number, lines: string[]) {
  const indent = "  ".repeat(depth);
  if (node.nodeType === 3) {
    const t = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (t) lines.push(indent + escapeText(t));
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).filter(isSignificant);
  const hasBlockChild = children.some(
    (c) => c.nodeType === 1 && BLOCK_TAGS.has((c as Element).tagName.toLowerCase()),
  );
  if (VOID_TAGS.has(tag) || !hasBlockChild || WHITESPACE_PRESERVING.has(tag)) {
    // Keep inline content (and pre/style) on one logical entry.
    for (const l of serialize(el, false).split("\n")) lines.push(indent + l);
    return;
  }
  lines.push(indent + openTag(el));
  for (const c of children) prettyNode(c, depth + 1, lines);
  lines.push(`${indent}</${tag}>`);
}

/** Pretty-prints HTML with one block element per line, for source diffs. */
export function prettyPrintHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html ?? ""}</body>`, "text/html");
  const lines: string[] = [];
  for (const c of Array.from(doc.body.childNodes).filter(isSignificant)) prettyNode(c, 0, lines);
  return lines.join("\n") + "\n";
}

/** Line diff of the pretty-printed base and proposed HTML. */
export function diffSource(baseHtml: string, proposedHtml: string): ChangeObject<string>[] {
  return diffLines(prettyPrintHtml(baseHtml), prettyPrintHtml(proposedHtml));
}

// ---------------------------------------------------------------------------
// Three-way merge
// ---------------------------------------------------------------------------

export type MergeHunk =
  | { type: "ok"; segments: Segment[] }
  | { type: "conflict"; index: number; base: Segment[]; current: Segment[]; proposed: Segment[] };

export interface MergeResult {
  /** True when no conflicts remain; `html` is then the merged document. */
  clean: boolean;
  html: string | null;
  hunks: MergeHunk[];
  conflictCount: number;
  /** Wrappers of the current version, re-applied when building output. */
  wrappers: ParsedHtml["wrappers"];
}

export type ConflictChoice = "current" | "suggestion";

/**
 * Three-way merge per segment. `base` is the version the suggestion started
 * from, `current` is the note's live version, `proposed` is the suggestion.
 * Non-overlapping changes merge automatically; overlapping ones become
 * conflict hunks for the reviewer to resolve.
 */
export function mergeSegments(baseHtml: string, currentHtml: string, proposedHtml: string): MergeResult {
  const base = parseHtml(baseHtml);
  const current = parseHtml(currentHtml);
  const proposed = parseHtml(proposedHtml);

  const byHtml = new Map<string, Segment>();
  for (const s of [...base.segments, ...current.segments, ...proposed.segments]) {
    if (!byHtml.has(s.html)) byHtml.set(s.html, s);
  }
  const keys = (segs: Segment[]) => segs.map((s) => s.html);
  const toSegs = (htmls: readonly string[]) => htmls.map((h) => byHtml.get(h)!);

  const regions = diff3Merge(keys(current.segments), keys(base.segments), keys(proposed.segments), {
    excludeFalseConflicts: true,
  });

  const hunks: MergeHunk[] = [];
  let conflictCount = 0;
  for (const region of regions) {
    if (region.ok) {
      const segs = toSegs(region.ok);
      const last = hunks[hunks.length - 1];
      if (last && last.type === "ok") last.segments.push(...segs);
      else hunks.push({ type: "ok", segments: segs });
    } else if (region.conflict) {
      hunks.push({
        type: "conflict",
        index: conflictCount++,
        current: toSegs(region.conflict.a),
        base: toSegs(region.conflict.o),
        proposed: toSegs(region.conflict.b),
      });
    }
  }

  const wrappers = current.wrappers;
  const clean = conflictCount === 0;
  return {
    clean,
    html: clean ? buildHtml(hunks.flatMap((h) => (h.type === "ok" ? h.segments : [])), wrappers) : null,
    hunks,
    conflictCount,
    wrappers,
  };
}

/**
 * Builds the merged HTML once every conflict has a choice.
 * `choices[i]` resolves the conflict hunk with `index === i`.
 */
export function resolveConflicts(result: MergeResult, choices: ConflictChoice[]): string {
  const segments: Segment[] = [];
  for (const hunk of result.hunks) {
    if (hunk.type === "ok") {
      segments.push(...hunk.segments);
      continue;
    }
    const choice = choices[hunk.index];
    if (!choice) throw new Error(`Conflict ${hunk.index + 1} has not been resolved`);
    segments.push(...(choice === "current" ? hunk.current : hunk.proposed));
  }
  return buildHtml(segments, result.wrappers);
}
