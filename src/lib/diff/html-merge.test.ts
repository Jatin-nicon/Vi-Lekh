import { describe, expect, it } from "vitest";
import { mergeSegments, resolveConflicts, segmentHtml } from "./html-diff";

const BASE = "<h1>Title</h1><p>Intro text</p><p>Middle text</p><p>End text</p>";
const htmls = (html: string) => segmentHtml(html).map((s) => s.html);

describe("mergeSegments", () => {
  it("merges non-overlapping edits cleanly", () => {
    const current = "<h1>Title v2</h1><p>Intro text</p><p>Middle text</p><p>End text</p>";
    const proposed = '<h1>Title</h1><p>Intro text</p><p>Middle text</p><p>End text</p><section data-section-id="cs1"><h3>Case Study</h3></section>';
    const result = mergeSegments(BASE, current, proposed);
    expect(result.clean).toBe(true);
    expect(htmls(result.html!)).toEqual([
      "<h1>Title v2</h1>",
      "<p>Intro text</p>",
      "<p>Middle text</p>",
      "<p>End text</p>",
      '<section data-section-id="cs1"><h3>Case Study</h3></section>',
    ]);
  });

  it("takes identical edits on both sides without a conflict", () => {
    const both = "<h1>Title</h1><p>Intro text, fixed</p><p>Middle text</p><p>End text</p>";
    expect(mergeSegments(BASE, both, both).clean).toBe(true);
  });

  it("reports a conflict when both sides edit the same section", () => {
    const current = "<h1>Title</h1><p>Intro by editor</p><p>Middle text</p><p>End text</p>";
    const proposed = "<h1>Title</h1><p>Intro by contributor</p><p>Middle text</p><p>End text</p>";
    const result = mergeSegments(BASE, current, proposed);
    expect(result.clean).toBe(false);
    expect(result.html).toBeNull();
    expect(result.conflictCount).toBe(1);
    const conflict = result.hunks.find((h) => h.type === "conflict");
    if (!conflict || conflict.type !== "conflict") throw new Error("expected conflict");
    expect(conflict.current.map((s) => s.html)).toEqual(["<p>Intro by editor</p>"]);
    expect(conflict.proposed.map((s) => s.html)).toEqual(["<p>Intro by contributor</p>"]);

    expect(htmls(resolveConflicts(result, ["current"]))).toEqual([
      "<h1>Title</h1>", "<p>Intro by editor</p>", "<p>Middle text</p>", "<p>End text</p>",
    ]);
    expect(htmls(resolveConflicts(result, ["suggestion"]))).toEqual([
      "<h1>Title</h1>", "<p>Intro by contributor</p>", "<p>Middle text</p>", "<p>End text</p>",
    ]);
  });

  it("refuses to build output while a conflict is unresolved", () => {
    const result = mergeSegments(BASE, BASE.replace("Intro text", "A"), BASE.replace("Intro text", "B"));
    expect(() => resolveConflicts(result, [])).toThrow(/not been resolved/);
  });

  it("keeps the current version's wrapper", () => {
    const wrap = (s: string) => `<div class="note">${s}</div>`;
    const result = mergeSegments(wrap(BASE), wrap(BASE), wrap(BASE + "<p>Added</p>"));
    expect(result.clean).toBe(true);
    expect(result.html!.startsWith('<div class="note">')).toBe(true);
    expect(htmls(result.html!).at(-1)).toBe("<p>Added</p>");
  });
});
