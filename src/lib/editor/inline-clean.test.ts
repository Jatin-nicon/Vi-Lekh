import { describe, expect, it } from "vitest";
import { cleanInline, isInlineOnly } from "./inline-clean";

describe("cleanInline", () => {
  it("keeps simple formatting and safe links", () => {
    expect(cleanInline(`A <b>bold</b>, <i class="x">it</i> and <a href="https://a.b" target="_blank">link</a>.`)).toBe(
      `A <b>bold</b>, <i class="x">it</i> and <a href="https://a.b">link</a>.`,
    );
  });

  it("drops scripts, event handlers and javascript: links", () => {
    expect(cleanInline(`x<script>alert(1)</script><b onclick="y()">z</b><a href="javascript:alert(1)">w</a>`)).toBe("x<b>z</b>w");
  });

  it("strips pasted styles and other sites' markup but keeps the text", () => {
    expect(cleanInline(`<span style="color:red;font-size:30px">Big</span> <font face="Arial">old</font> <div>next line</div>`)).toBe(
      "<span>Big</span> old <br>next line",
    );
  });

  it("removes the browser's trailing line break and turns non-breaking spaces into spaces", () => {
    expect(cleanInline("Hello&nbsp;world<br>")).toBe("Hello world");
  });
});

describe("palette formatting", () => {
  it("keeps strikethrough and palette colours, drops other colours and properties", () => {
    expect(cleanInline(`<s>old</s> <span style="color: #dc2626">red</span> <mark style="background-color: rgba(250, 204, 21, 0.4)">hi</mark>`)).toBe(
      `<s>old</s> <span style="color: #dc2626">red</span> <mark style="background-color: rgba(250, 204, 21, 0.4)">hi</mark>`,
    );
    expect(cleanInline(`<span style="color: #123456">x</span> <span style="color: #dc2626; font-size: 40px">y</span>`)).toBe(
      `<span>x</span> <span style="color: #dc2626">y</span>`,
    );
    expect(cleanInline(`<mark style="color: #dc2626">z</mark>`)).toBe(`<mark>z</mark>`);
  });

  it("treats blocks with palette colours as editable, and other styles as not", () => {
    const p = document.createElement("p");
    p.innerHTML = `A <span style="color: #2563eb">b</span> <s>c</s>`;
    expect(isInlineOnly(p)).toBe(true);
    p.innerHTML = `A <span style="color: #2563eb; font-weight: 700">b</span>`;
    expect(isInlineOnly(p)).toBe(false);
  });
});

describe("isInlineOnly", () => {
  it("allows blocks with simple inline markup only", () => {
    const p = document.createElement("p");
    p.innerHTML = `A <span class="u">b</span> <b>c</b>`;
    expect(isInlineOnly(p)).toBe(true);
    p.innerHTML = `A <svg></svg>`;
    expect(isInlineOnly(p)).toBe(false);
    p.innerHTML = `A <span style="color:red">b</span>`;
    expect(isInlineOnly(p)).toBe(false);
  });
});
