import { describe, expect, it } from "vitest";
import {
  CONTENT_HEIGHT, PAGE_HEIGHT, PAGE_MARGIN, PAGE_PITCH, SPACER_ATTR, pageCountFor, paginate, type Box,
} from "./paginate";

/** Fake block layout: leaves take `data-h`, containers sum children, spacers use style.height. */
function heightOf(el: Element): number {
  const h = el as HTMLElement;
  if (h.hasAttribute(SPACER_ATTR)) return parseFloat(h.style.height) || 0;
  if (h.dataset.h) return Number(h.dataset.h);
  return Array.from(el.children).reduce((sum, c) => sum + heightOf(c), 0);
}

function measure(el: HTMLElement, root: HTMLElement): Box {
  let top = 0;
  let node: Element = el;
  while (node !== root) {
    const parent = node.parentElement!;
    for (const sib of Array.from(parent.children)) {
      if (sib === node) break;
      top += heightOf(sib);
    }
    node = parent;
  }
  return { top: top + PAGE_MARGIN, height: heightOf(el) };
}

const rootHeight = (root: HTMLElement) => PAGE_MARGIN + heightOf(root) + PAGE_MARGIN;

function flow(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

const run = (root: HTMLElement) => paginate(root, { measure, rootHeight });
const topOf = (root: HTMLElement, sel: string) => measure(root.querySelector(sel) as HTMLElement, root).top;

describe("paginate", () => {
  it("leaves content that fits on one page alone", () => {
    const root = flow('<p data-h="300"></p><p data-h="300"></p>');
    expect(run(root)).toEqual({ pageCount: 1, spacerCount: 0 });
  });

  it("moves an element crossing the bottom margin to the next page", () => {
    const root = flow('<p data-h="900"></p><p id="b" data-h="200"></p>');
    const result = run(root);
    expect(result.spacerCount).toBe(1);
    expect(topOf(root, "#b")).toBe(PAGE_PITCH + PAGE_MARGIN);
    expect(result.pageCount).toBe(2);
  });

  it("lets a section flow across pages, but keeps contributions whole", () => {
    const kids = '<p data-h="200"></p><p class="k" data-h="200"></p>';
    const root = flow(`<p data-h="700"></p><section>${kids}</section>`);
    run(root);
    expect(topOf(root, "section")).toBe(PAGE_MARGIN + 700);
    expect(topOf(root, ".k")).toBe(PAGE_PITCH + PAGE_MARGIN);
    const whole = flow(`<p data-h="700"></p><section class="vl-contribution">${kids}</section>`);
    run(whole);
    expect(topOf(whole, "section")).toBe(PAGE_PITCH + PAGE_MARGIN);
  });

  it("uses custom page margins", () => {
    const root = flow('<p data-h="930"></p><p id="b" data-h="100"></p>');
    paginate(root, { measure: (e, r) => { const b = measure(e, r); return { ...b, top: b.top - PAGE_MARGIN + 40 }; }, rootHeight, margins: { top: 40, bottom: 40 } });
    expect(root.querySelectorAll(`[${SPACER_ATTR}]`)).toHaveLength(0);
  });

  it("splits an element taller than a page between its children", () => {
    const kids = Array.from({ length: 6 }, (_, i) => `<p id="k${i}" data-h="300"></p>`).join("");
    const root = flow(`<div id="tall">${kids}</div>`);
    run(root);
    // 3 × 300 = 900 fits in the 979px content area; the 4th child moves to page 2.
    expect(topOf(root, "#k3")).toBe(PAGE_PITCH + PAGE_MARGIN);
    expect(root.querySelector("#tall")!.querySelectorAll(`[${SPACER_ATTR}]`)).toHaveLength(1);
  });

  it("leaves an atomic element taller than a page crossing the boundary", () => {
    const root = flow(`<pre id="code" data-h="${CONTENT_HEIGHT + 200}"></pre>`);
    const result = run(root);
    expect(result.spacerCount).toBe(0);
    expect(result.pageCount).toBe(2);
  });

  it("keeps a heading on the same page as the start of the next element", () => {
    // Heading fits (900 + 40 < 979) but the paragraph after it starts below the bottom margin.
    const root = flow('<p data-h="900"></p><h3 id="h" data-h="40"></h3><p id="p" data-h="200"></p>');
    run(root);
    expect(topOf(root, "#h")).toBe(PAGE_PITCH + PAGE_MARGIN);
    expect(topOf(root, "#p")).toBe(PAGE_PITCH + PAGE_MARGIN + 40);
  });

  it("is idempotent: re-running removes old spacers first", () => {
    const root = flow('<p data-h="900"></p><p data-h="200"></p>');
    run(root);
    run(root);
    expect(root.querySelectorAll(`[${SPACER_ATTR}]`)).toHaveLength(1);
  });
});

describe("pageCountFor", () => {
  it("counts sheets from the flow height", () => {
    expect(pageCountFor(0)).toBe(1);
    expect(pageCountFor(PAGE_HEIGHT)).toBe(1);
    expect(pageCountFor(PAGE_PITCH + PAGE_HEIGHT)).toBe(2);
  });
});
