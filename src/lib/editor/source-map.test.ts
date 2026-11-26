import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { innerRange, insertAfter, locate, parseSource, renderedPath, replaceInner, resolvePath } from "./source-map";
import { prepareDocument } from "@/lib/layout/document-html";
import { diffSegments } from "@/lib/diff/html-diff";

/** Renders like the viewer: documents through prepareDocument, fragments as is. */
function render(html: string, isDocument: boolean): HTMLElement {
  const host = document.createElement("div");
  host.className = "vl-flow";
  host.innerHTML = isDocument ? prepareDocument(html) : html;
  document.body.replaceChildren(host);
  return isDocument ? (host.querySelector(".vl-doc") as HTMLElement) : host;
}

const DOC = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>T</title><style>p{color:red}</style></head>
<body>
<main class="page">
  <style>.x{top:0}</style>
  <h1>Title</h1>
  <p>First <b>bold</b> sentence.</p>
  <ul><li>One<li>Two</ul>
  <section><h3>Part</h3><p>Inner para</p></section>
</main>
<script>1</script>
</body>
</html>`;

describe("source map", () => {
  it("maps rendered document elements to the source, skipping removed elements", () => {
    const root = render(DOC, true);
    const tree = parseSource(DOC);
    for (const el of Array.from(root.querySelectorAll("h1, p, li, h3"))) {
      const found = locate(tree, el, root);
      expect(found.ok, el.outerHTML).toBe(true);
    }
  });

  it("splices an edit and leaves every other character unchanged", () => {
    const root = render(DOC, true);
    const tree = parseSource(DOC);
    const p = root.querySelector("section p")!;
    const loc = locate(tree, p, root);
    if (!loc.ok) throw new Error(loc.reason);
    const out = replaceInner(DOC, loc.element, "Changed para");
    expect(out).toBe(DOC.replace("Inner para", "Changed para"));
    const changes = diffSegments(DOC, out).filter((d) => d.type !== "unchanged");
    expect(changes).toHaveLength(1);
  });

  it("handles implied end tags and inserting after a block", () => {
    const root = render(DOC, true);
    const tree = parseSource(DOC);
    const li = root.querySelectorAll("li")[0];
    const loc = locate(tree, li, root);
    if (!loc.ok) throw new Error(loc.reason);
    expect(replaceInner(DOC, loc.element, "Uno")).toBe(DOC.replace("<li>One<li>", "<li>Uno<li>"));
    const h1 = locate(tree, root.querySelector("h1")!, root);
    if (!h1.ok) throw new Error(h1.reason);
    expect(insertAfter(DOC, h1.element, "<p>New</p>")).toBe(DOC.replace("<h1>Title</h1>", "<h1>Title</h1>\n<p>New</p>"));
  });

  it("ignores page spacers and link layers the viewer adds, and maps fragments", () => {
    const FRAG = `<h2>A</h2><div class="card"><p>Text one</p><p>Text two</p></div>`;
    const root = render(FRAG, false);
    root.querySelector(".card")!.insertBefore(Object.assign(document.createElement("div"), { innerHTML: "" }), root.querySelector(".card p"));
    (root.querySelector(".card")!.firstElementChild as HTMLElement).setAttribute("data-vl-page-spacer", "");
    root.append(Object.assign(document.createElement("div"), { className: "ov" }));
    (root.lastElementChild as HTMLElement).setAttribute("data-vl-overlay", "");
    const tree = parseSource(FRAG);
    const second = root.querySelectorAll(".card p")[1];
    expect(renderedPath(second, root)).toEqual([1, 1]);
    const loc = locate(tree, second, root);
    expect(loc.ok).toBe(true);
    if (loc.ok) expect(replaceInner(FRAG, loc.element, "2")).toBe(FRAG.replace("Text two", "2"));
  });

  it("refuses when the source no longer matches the page", () => {
    const root = render(DOC, true);
    const tree = parseSource(DOC.replace("Inner para", "Different text"));
    expect(locate(tree, root.querySelector("section p")!, root)).toEqual({ ok: false, reason: "text-mismatch" });
    expect(resolvePath(tree, [9, 9])).toBeNull();
  });

  // The imported lessons are not in the repository. Point LESSONS_DIR at a folder of them to run this.
  const dir = process.env.LESSONS_DIR;
  it.runIf(Boolean(dir))("maps every text block of the imported lessons and edits only that block", () => {
    const files = fs.readdirSync(dir!).filter((f) => f.endsWith(".html"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const html = fs.readFileSync(path.join(dir!, f), "utf8");
      const root = render(html, true);
      const tree = parseSource(html);
      const blocks = Array.from(root.querySelectorAll("p, h1, h2, h3, h4, li, td, th, figcaption"));
      let ok = 0;
      for (const el of blocks) {
        const loc = locate(tree, el, root);
        if (!loc.ok) continue;
        ok++;
        const { start, end } = innerRange(loc.element);
        expect(replaceInner(html, loc.element, "EDITED")).toBe(html.slice(0, start) + "EDITED" + html.slice(end));
      }
      expect(ok, f).toBe(blocks.length);
    }
  });
});
