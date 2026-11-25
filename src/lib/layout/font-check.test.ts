import { describe, expect, it } from "vitest";
import { findUnbundledFonts } from "./font-check";

describe("findUnbundledFonts", () => {
  it("reports Arial in a style attribute", () => {
    expect(findUnbundledFonts('<p style="font-family: Arial, sans-serif">Hi</p>')).toEqual(["Arial"]);
  });

  it("reports nothing for the default fonts", () => {
    expect(findUnbundledFonts("<h1>Title</h1><p>Body</p>")).toEqual([]);
    expect(findUnbundledFonts('<p style="font-family: \'Vi-Lekh Serif\', serif">Hi</p>')).toEqual([]);
    expect(findUnbundledFonts('<p style="font-family: inherit">Hi</p>')).toEqual([]);
  });

  it("checks style blocks and the font shorthand", () => {
    const html = `<style>.a { font-family: "Comic Sans MS"; } .b { font: italic 700 14px/1.4 Georgia, serif; }</style>`;
    expect(findUnbundledFonts(html)).toEqual(["Comic Sans MS", "Georgia"]);
  });

  it("reports generic families, which differ per OS", () => {
    expect(findUnbundledFonts('<code style="font-family: monospace">x</code>')).toEqual(["monospace"]);
  });

  it("does not treat other properties as fonts", () => {
    expect(findUnbundledFonts('<p style="font-size: 14px; font-weight: 700">Hi</p>')).toEqual([]);
  });

  it("lists each font once", () => {
    expect(findUnbundledFonts('<p style="font-family:Arial">a</p><p style="font-family: arial">b</p>')).toEqual(["Arial"]);
  });
});
