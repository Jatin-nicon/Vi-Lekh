import { describe, expect, it } from "vitest";
import { renderSegmentDiff } from "./render-diff";

describe("renderSegmentDiff", () => {
  it("marks an added case study and a changed paragraph (spec: Rendered diff)", () => {
    const base = "<h1>Title</h1><p>The quick brown fox jumps over the dog</p>";
    const proposed =
      '<h1>Title</h1><p>The quick red fox jumps over the dog</p><section class="vl-contribution" data-section-id="cs1"><h3>Case Study</h3><p>Context</p></section>';
    const { html, summary } = renderSegmentDiff(base, proposed);
    expect(summary).toEqual({ added: 1, removed: 0, changed: 1, unchanged: 1 });
    expect(html).toContain('<div class="vl-diff vl-diff-added"><section');
    // Changed paragraph keeps its tag and shows both old and new words.
    expect(html).toMatch(/<div class="vl-diff vl-diff-changed"><p>.*<del>brown<\/del>.*<ins>red<\/ins>.*<\/p><\/div>/);
  });

  it("stacks old and new for a changed element with nested markup", () => {
    const base = '<ul id="l"><li>one</li><li>two</li></ul>';
    const proposed = '<ul id="l"><li>one</li><li>three</li></ul>';
    const { html } = renderSegmentDiff(base, proposed);
    expect(html).toContain('<div class="vl-diff-old"><ul id="l"><li>one</li><li>two</li></ul></div>');
    expect(html).toContain('<div class="vl-diff-new"><ul id="l"><li>one</li><li>three</li></ul></div>');
  });

  it("marks a removed section and escapes word-diff text", () => {
    const { html, summary } = renderSegmentDiff("<p>a &lt; b</p><p>gone for good</p>", "<p>a &lt; b</p>");
    expect(summary.removed).toBe(1);
    expect(html).toContain('<div class="vl-diff vl-diff-removed"><p>gone for good</p></div>');
  });
});
