import { describe, expect, it } from "vitest";
import { blockAnchor, buildAnchor, clearHighlights, findAnchor, highlight, MARK_ATTR } from "./comment-anchor";

const NOTE = `
<h1>Plants</h1>
<p>Leaves make <b>food</b> from sunlight.   Roots take up water.</p>
<ul><li>Roots hold the plant.</li><li>Leaves make food.</li></ul>
<div data-vl-page-spacer>ignored spacer text</div>
<p>Stems carry water.</p>`;

function render(html = NOTE): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.replaceChildren(root);
  return root;
}

/** Selects `text` (its `nth` occurrence) inside `el`. */
function select(el: Element, text: string, nth = 0): Range {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let seen = 0;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    let i = n.data.indexOf(text);
    while (i >= 0) {
      if (seen++ === nth) {
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + text.length);
        return r;
      }
      i = n.data.indexOf(text, i + 1);
    }
  }
  throw new Error(`no ${text}`);
}

describe("comment anchors", () => {
  it("builds an anchor with collapsed text, context and the block path", () => {
    const root = render();
    const p = root.querySelector("p")!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 0); // "Leaves make "
    range.setEnd(p.lastChild!, " from sunlight.  ".length); // ends in the run of spaces
    const a = buildAnchor(range, root)!;
    expect(a.quote).toBe("Leaves make food from sunlight.");
    expect(a.prefix).toBe("Plants ");
    expect(a.suffix).toBe(" Roots take up water. Roots hold");
    expect(a.path).toEqual([1]);
    expect(buildAnchor(select(root, "Stems"), root)!.path).toEqual([3]);
  });

  it("keeps context to 32 characters on each side and ignores the viewer's spacers", () => {
    const root = render();
    const a = buildAnchor(select(root, "Stems"), root)!;
    expect(a.prefix).toHaveLength(32);
    expect(a.prefix).not.toContain("spacer");
    expect(blockAnchor(root.querySelector("li")!, root)!.quote).toBe("Roots hold the plant.");
  });

  it("finds the exact spot, telling repeated text apart by its context", () => {
    const root = render();
    const second = buildAnchor(select(root, "Leaves make", 1), root)!;
    const found = findAnchor(root, second)!;
    expect(found.toString()).toBe("Leaves make");
    expect(found.startContainer.parentElement!.tagName).toBe("LI");
    const first = buildAnchor(select(root, "Leaves make", 0), root)!;
    expect(findAnchor(root, first)!.startContainer.parentElement!.tagName).toBe("P");
  });

  it("finds text that moved to another block", () => {
    const root = render();
    const a = buildAnchor(select(root, "Stems carry water."), root)!;
    const moved = render(`<p>Intro added.</p><h1>Plants</h1><ul><li>Stems carry water.</li></ul>`);
    const found = findAnchor(moved, a)!;
    expect(found.toString()).toBe("Stems carry water.");
    expect(found.startContainer.parentElement!.tagName).toBe("LI");
  });

  it("returns null when the text is gone", () => {
    const root = render();
    const a = buildAnchor(select(root, "Roots take up water."), root)!;
    expect(findAnchor(render(`<p>Leaves make food.</p>`), a)).toBeNull();
    expect(findAnchor(root, { quote: "   " })).toBeNull();
  });

  it("highlights across inline tags and clears back to the same markup", () => {
    const root = render();
    const before = root.innerHTML;
    const p = root.querySelector("p")!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 7); // "make "
    range.setEnd(p.lastChild!, 5); // " from"
    const a = buildAnchor(range, root)!;
    expect(a.quote).toBe("make food from");
    const marks = highlight(findAnchor(root, a)!, "t1");
    expect(marks.map((m) => m.textContent).join("")).toBe("make food from");
    expect(p.querySelector("b > mark")).not.toBeNull();
    expect(root.querySelectorAll(`[${MARK_ATTR}="t1"]`)).toHaveLength(3);
    // Anchors still resolve with marks present.
    expect(findAnchor(root, a)!.toString()).toBe("make food from");
    clearHighlights(root);
    expect(root.innerHTML).toBe(before);
  });
  it("leaves out KaTeX's hidden copy of a formula", () => {
    const root = render(`<p>The loss is <span class="katex"><span class="katex-mathml"><math><annotation>L = x^2</annotation></math></span><span class="katex-html">L=x2</span></span> here.</p>`);
    const a = blockAnchor(root.querySelector("p")!, root)!;
    expect(a.quote).toBe("The loss is L=x2 here.");
    expect(findAnchor(root, a)!.toString()).toContain("L = x^2"); // the range spans the formula
  });
});
