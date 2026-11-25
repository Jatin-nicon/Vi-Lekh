import { describe, expect, it } from "vitest";
import { isHtmlDocument, mediaApplies, prepareDocument } from "./document-html";
import { findUnbundledFonts } from "./font-check";
import { buildHtml, mergeSegments, parseHtml } from "@/lib/diff/html-diff";
import { renderSegmentDiff } from "@/lib/diff/render-diff";

const page = (css: string, body: string) =>
  `<!doctype html><html><head><title>T</title><style>${css}</style></head><body>${body}</body></html>`;

describe("isHtmlDocument", () => {
  it("tells documents from fragments", () => {
    expect(isHtmlDocument("\n<!DOCTYPE html><html></html>")).toBe(true);
    expect(isHtmlDocument("<html lang='en'><body></body></html>")).toBe(true);
    expect(isHtmlDocument("<h1>Note</h1>")).toBe(false);
    expect(isHtmlDocument("")).toBe(false);
  });
});

describe("mediaApplies", () => {
  it("evaluates queries on screen at the fixed width, not the viewport", () => {
    expect(mediaApplies("print")).toBe(false);
    expect(mediaApplies("(max-width:820px)")).toBe(false);
    expect(mediaApplies("screen and (min-width:1000px)")).toBe(true);
    expect(mediaApplies("screen, print")).toBe(true);
    expect(mediaApplies("(prefers-color-scheme: dark)")).toBe(false);
  });
});

describe("prepareDocument", () => {
  it("scopes selectors and maps html, body and :root to the wrapper", () => {
    const html = prepareDocument(page(`:root{--a:1}body{color:red}html,body.x>p,a:is(b,c){top:0}`, "<p>x</p>"));
    const R = ".vl-doc.vl-doc.vl-doc.vl-doc";
    expect(html).toContain(`${R}{--a:1}`);
    expect(html).toContain(`${R},${R}.x>p,${R} a:is(b,c){top:0}`);
    expect(html).toContain('<div class="vl-doc"><p>x</p></div>');
  });

  it("drops print rules and narrow breakpoints, and pins viewport units", () => {
    const html = prepareDocument(
      page(`@media print{.a{top:1px}}@media (max-width:500px){.b{top:2px}}@page{size:A4;margin:10mm}.c{min-height:100vh;width:50vw}`, ""),
    );
    expect(html).not.toMatch(/\.a\{|\.b\{|@page/);
    expect(html).toContain(".c{min-height:900px;width:552px}");
  });

  it("survives braces and semicolons in strings", () => {
    const html = prepareDocument(page(`.a:before{content:"};{"}.b{top:0}`, ""));
    expect(html).toContain('.a:before{content:"};{"}');
    expect(html).toContain(" .b{top:0}");
  });

  it("maps known web fonts to the bundled ones", () => {
    const html = prepareDocument(page(`:root{--h:Caveat, cursive}p{font-family:"Source Serif 4", serif}b{font:600 10px/1.6 Inter, sans-serif}`, `<i style="font-family:Inter">x</i>`));
    expect(html).toContain("--h:'Vi-Lekh Hand', cursive");
    expect(html).toContain("font-family:'Vi-Lekh Serif', serif");
    expect(html).toContain("font:600 10px/1.6 'Vi-Lekh Sans', sans-serif");
    expect(html).toContain(`style="font-family:'Vi-Lekh Sans'"`);
    expect(findUnbundledFonts(page(`p{font-family:Inter}b{font-family:Arial}`, ""))).toEqual(["Arial"]);
    expect(findUnbundledFonts(`<p style="font-family:Inter">x</p>`)).toEqual(["Inter"]);
  });

  it("removes scripts, handlers and javascript: links", () => {
    const html = prepareDocument(page("", `<script>1</script><a href=" javascript:x" onclick="y">z</a>`));
    expect(html).toContain("<a>z</a>");
    expect(html).not.toMatch(/script|onclick/);
  });
});

describe("documents in diff and merge", () => {
  const base = page(".a{top:0}", "<main class='page'><p>One.</p><p>Two.</p></main>");

  it("round-trips the head", () => {
    const { segments, wrappers } = parseHtml(base);
    expect(segments.filter((s) => s.tag === "p")).toHaveLength(2);
    const out = buildHtml(segments, wrappers);
    expect(isHtmlDocument(out)).toBe(true);
    expect(out).toContain("<title>T</title>");
    expect(out).toContain("<style>.a{top:0}</style>");
    expect(parseHtml(out)).toEqual(parseHtml(base));
  });

  it("merges edits from both sides and keeps the head", () => {
    const r = mergeSegments(base, base.replace("One.", "One!"), base.replace("</main>", "<p>Three.</p></main>"));
    expect(r.clean).toBe(true);
    expect(r.html).toContain("One!");
    expect(r.html).toContain("Three.");
    expect(r.html).toContain("<style>.a{top:0}</style>");
  });

  it("keeps the document's design in the rendered diff", () => {
    const { html, summary } = renderSegmentDiff(base, base.replace("Two.", "Two changed."));
    expect(summary.changed + summary.added).toBeGreaterThan(0);
    expect(isHtmlDocument(html)).toBe(true);
    expect(html).toContain(".a{top:0}");
  });
});
