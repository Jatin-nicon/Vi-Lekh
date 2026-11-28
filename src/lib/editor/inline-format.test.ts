import { describe, expect, it } from "vitest";
import { activeFormats, clearFormatting, setHighlight, setLink, setTextColor, toggleFormat } from "./inline-format";
import { cleanInline } from "./inline-clean";

function block(html: string): HTMLElement {
  const p = document.createElement("p");
  p.innerHTML = html;
  document.body.replaceChildren(p);
  return p;
}

/** A range over the `nth` occurrence of `text` (which must sit in one text node). */
function select(el: Element, text: string, nth = 0): Range {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let seen = 0;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    for (let i = n.data.indexOf(text); i >= 0; i = n.data.indexOf(text, i + 1)) {
      if (seen++ === nth) {
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + text.length);
        return r;
      }
    }
  }
  throw new Error(`no ${text}`);
}

/** A range from the start of `a` to the end of `b`. */
function across(el: Element, a: string, b: string): Range {
  const r = document.createRange();
  const ra = select(el, a);
  const rb = select(el, b);
  r.setStart(ra.startContainer, ra.startOffset);
  r.setEnd(rb.endContainer, rb.endOffset);
  return r;
}

const html = (el: Element) => cleanInline(el.innerHTML);

describe("inline formatting", () => {
  it("bolds a word and keeps it selected", () => {
    const p = block("Make this bold please");
    const r = toggleFormat(p, select(p, "this"), "bold")!;
    expect(html(p)).toBe("Make <b>this</b> bold please");
    expect(r.toString()).toBe("this");
  });

  it("unbolds when all of the selection is bold, splitting the bold around it", () => {
    const p = block("<b>all of this</b> text");
    toggleFormat(p, select(p, "of"), "bold");
    expect(html(p)).toBe("<b>all </b>of<b> this</b> text");
    const q = block("<strong>strong</strong> word");
    toggleFormat(q, select(q, "strong"), "bold");
    expect(html(q)).toBe("strong word");
  });

  it("bolds only the plain part of a partly bold selection, joining neighbours", () => {
    const p = block("one <b>two</b> three");
    toggleFormat(p, across(p, "one", "two"), "bold");
    expect(html(p)).toBe("<b>one two</b> three");
  });

  it("works across other inline tags", () => {
    const p = block("a <i>b c</i> d");
    toggleFormat(p, across(p, "a", "b"), "underline");
    expect(html(p)).toBe("<u>a </u><i><u>b</u> c</i> d");
    toggleFormat(p, select(p, "d"), "strike");
    expect(html(p)).toContain("<s>d</s>");
  });

  it("colours, recolours and uncolours text with palette spans", () => {
    const p = block("red then blue");
    setTextColor(p, select(p, "red"), "#dc2626");
    expect(html(p)).toBe(`<span style="color: #dc2626">red</span> then blue`);
    setTextColor(p, select(p, "red"), "#2563eb");
    expect(html(p)).toBe(`<span style="color: #2563eb">red</span> then blue`);
    setTextColor(p, select(p, "red"), null);
    expect(html(p)).toBe("red then blue");
  });

  it("highlights with palette marks, leaving the lesson's own marks alone", () => {
    const p = block(`<mark class="key">key</mark> and more`);
    setHighlight(p, select(p, "more"), "rgba(250, 204, 21, 0.4)");
    expect(html(p)).toBe(`<mark class="key">key</mark> and <mark style="background-color: rgba(250, 204, 21, 0.4)">more</mark>`);
    clearFormatting(p, across(p, "key", "more"));
    expect(html(p)).toBe(`<mark class="key">key</mark> and more`);
  });

  it("clears bold, italic, underline, strikethrough and colour but keeps the words and links", () => {
    const p = block(`<b>b</b> <i>i</i> <u>u</u> <s>s</s> <span style="color: #dc2626">c</span> <a href="https://x.y">link</a>`);
    clearFormatting(p, across(p, "b", "link"));
    expect(html(p)).toBe(`b i u s c <a href="https://x.y">link</a>`);
  });

  it("adds and removes links, and refuses unsafe ones", () => {
    const p = block("see the docs here");
    setLink(p, select(p, "the docs"), "https://example.com");
    expect(html(p)).toBe(`see <a href="https://example.com">the docs</a> here`);
    expect(() => setLink(p, select(p, "here"), "javascript:alert(1)")).toThrow();
    const caret = document.createRange();
    const t = select(p, "docs");
    caret.setStart(t.startContainer, 1);
    caret.collapse(true);
    setLink(p, caret, null);
    expect(html(p)).toBe("see the docs here");
  });

  it("reports which formats are on", () => {
    const p = block(`<b>bold <i>both</i></b> <span style="color: #16a34a">green</span> plain`);
    expect(activeFormats(p, select(p, "both"))).toMatchObject({ bold: true, italic: true, underline: false, color: null });
    expect(activeFormats(p, across(p, "bold", "both"))).toMatchObject({ bold: true, italic: false });
    expect(activeFormats(p, select(p, "green")).color).toBe("#16a34a");
    expect(activeFormats(p, across(p, "green", "plain")).color).toBeNull();
  });

  it("output survives the clean-up unchanged", () => {
    const p = block("one two three four");
    toggleFormat(p, select(p, "one"), "bold");
    toggleFormat(p, select(p, "two"), "strike");
    setTextColor(p, select(p, "three"), "#9333ea");
    setHighlight(p, select(p, "four"), "rgba(96, 165, 250, 0.4)");
    expect(cleanInline(p.innerHTML)).toBe(p.innerHTML);
  });
});
