import { describe, expect, it } from "vitest";
import { diffSegments, diffSource, segmentHtml } from "./html-diff";

const types = (base: string, proposed: string) => diffSegments(base, proposed).map((e) => e.type);

describe("diffSegments", () => {
  it("marks an added section", () => {
    expect(types("<p>One</p>", '<p>One</p><section data-section-id="cs1"><h3>Case Study</h3></section>'))
      .toEqual(["unchanged", "added"]);
  });

  it("marks a removed section", () => {
    expect(types("<p>One</p><p>Two words here</p>", "<p>One</p>")).toEqual(["unchanged", "removed"]);
  });

  it("pairs an edited paragraph as changed with a word diff", () => {
    const diff = diffSegments(
      "<h2>Title</h2><p>The quick brown fox jumps</p>",
      "<h2>Title</h2><p>The quick red fox jumps</p>",
    );
    expect(diff.map((e) => e.type)).toEqual(["unchanged", "changed"]);
    const changed = diff[1];
    if (changed.type !== "changed") throw new Error("expected changed");
    expect(changed.words.some((w) => w.added && w.value.includes("red"))).toBe(true);
    expect(changed.words.some((w) => w.removed && w.value.includes("brown"))).toBe(true);
  });

  it("unwraps a single wrapper div", () => {
    expect(segmentHtml('<div class="note"><p>a</p><p>b</p></div>').map((s) => s.html)).toEqual(["<p>a</p>", "<p>b</p>"]);
    expect(types('<div class="note"><p>a</p><p>b</p></div>', "<p>a</p><p>b</p>")).toEqual(["unchanged", "unchanged"]);
  });

  it("ignores attribute order and whitespace", () => {
    expect(types('<p class="x" id="y">Hi  there</p>', '<p id="y"  class="x">Hi\n there</p>')).toEqual(["unchanged"]);
  });
});

describe("diffSource", () => {
  it("reports added and removed lines", () => {
    const changes = diffSource("<p>a</p>", "<p>a</p><p>b</p>");
    expect(changes.some((c) => c.added && c.value.includes("<p>b</p>"))).toBe(true);
  });
});
