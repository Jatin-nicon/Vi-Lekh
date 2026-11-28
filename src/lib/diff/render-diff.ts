import type { ChangeObject } from "diff";
import { isHtmlDocument } from "@/lib/layout/document-html";
import { diffSegments, parseHtml, type Segment, type SegmentDiffEntry } from "./html-diff";

/**
 * Builds one HTML document that shows a segment diff (design D8, rendered
 * mode): added sections in green, removed in red, changed sections with an
 * inline word diff when they are plain text, or old and new stacked when not.
 * The result is meant for the paged HtmlSandboxedViewer, so the diff styles
 * ship inside the document.
 */

export const DIFF_CSS = `
  .vl-diff { position: relative; margin: 0.75em 0; padding: 0.25em 0.75em; border-left: 3px solid; border-radius: 4px; }
  .vl-diff::before {
    display: block; font: 600 10px/1.6 "Vi-Lekh Sans", system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.15em;
  }
  .vl-diff > :first-child { margin-top: 0.25em; }
  .vl-diff > :last-child { margin-bottom: 0.25em; }
  .vl-diff-added { border-color: #2F855A; background: rgba(47, 133, 90, 0.08); }
  .vl-diff-added::before { content: "Added"; color: #2F855A; }
  .vl-diff-removed { border-color: #C53030; background: rgba(197, 48, 48, 0.07); }
  .vl-diff-removed::before { content: "Removed"; color: #C53030; }
  .vl-diff-removed > * { text-decoration: line-through; text-decoration-color: rgba(197, 48, 48, 0.6); opacity: 0.75; }
  .vl-diff-changed { border-color: #B7791F; background: rgba(183, 121, 31, 0.08); }
  .vl-diff-changed::before { content: "Changed"; color: #B7791F; }
  .vl-diff-old > * { text-decoration: line-through; text-decoration-color: rgba(197, 48, 48, 0.6); opacity: 0.7; }
  .vl-diff ins { text-decoration: none; background: rgba(47, 133, 90, 0.22); border-radius: 2px; }
  .vl-diff del { text-decoration: line-through; color: #C53030; background: rgba(197, 48, 48, 0.12); border-radius: 2px; }
  .dark .vl-diff-added::before { color: #68D391; }
  .dark .vl-diff-removed::before { color: #FC8181; }
  .dark .vl-diff-changed::before { color: #F6AD55; }
`;

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wordDiffHtml(words: ChangeObject<string>[]): string {
  return words
    .map((w) =>
      w.added ? `<ins>${escapeText(w.value)}</ins>` : w.removed ? `<del>${escapeText(w.value)}</del>` : escapeText(w.value),
    )
    .join("");
}

/** True when the segment is a single element whose only content is text. */
function textOnlyElement(segment: Segment): { open: string; close: string } | null {
  const m = /^(<([a-z][a-z0-9-]*)(?:\s[^>]*)?>)([^<]*)(<\/\2>)$/i.exec(segment.html);
  return m ? { open: m[1], close: m[4] } : null;
}

function renderEntry(entry: SegmentDiffEntry): string {
  switch (entry.type) {
    case "unchanged":
      return entry.proposed.html;
    case "added":
      // Outer style/script segments are not content; show them as-is.
      return entry.proposed.outer ? entry.proposed.html : `<div class="vl-diff vl-diff-added">${entry.proposed.html}</div>`;
    case "removed":
      return entry.base.outer ? "" : `<div class="vl-diff vl-diff-removed">${entry.base.html}</div>`;
    case "changed": {
      const oldShell = textOnlyElement(entry.base);
      const newShell = textOnlyElement(entry.proposed);
      if (oldShell && newShell && entry.base.tag === entry.proposed.tag) {
        return `<div class="vl-diff vl-diff-changed">${newShell.open}${wordDiffHtml(entry.words)}${newShell.close}</div>`;
      }
      return `<div class="vl-diff vl-diff-changed"><div class="vl-diff-old">${entry.base.html}</div><div class="vl-diff-new">${entry.proposed.html}</div></div>`;
    }
  }
}

export function summarizeDiff(entries: SegmentDiffEntry[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  for (const e of entries) {
    if (e.type === "added" && e.proposed.outer) continue;
    if (e.type === "removed" && e.base.outer) continue;
    summary[e.type]++;
  }
  return summary;
}

/** Renders the rendered-mode diff document and its summary. */
export function renderSegmentDiff(baseHtml: string, proposedHtml: string): { html: string; summary: DiffSummary } {
  const entries = diffSegments(baseHtml, proposedHtml);
  const body = entries.map(renderEntry).join("\n");
  const styled = `<style>${DIFF_CSS}</style>\n${body}`;
  const { wrappers } = parseHtml(proposedHtml);
  const html = isHtmlDocument(proposedHtml)
    ? `${wrappers.map((w) => w.open).join("")}${styled}${[...wrappers].reverse().map((w) => w.close).join("")}`
    : styled;
  return { html, summary: summarizeDiff(entries) };
}
