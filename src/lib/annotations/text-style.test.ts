import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TEXT_STYLE, loadTextStyle, saveTextStyle } from "./text-style";

describe("text box style", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    });
  });

  it("starts as blue handwriting and remembers changes", () => {
    expect(loadTextStyle()).toEqual(DEFAULT_TEXT_STYLE);
    saveTextStyle({ font: "sans" });
    saveTextStyle({ fontSize: 24 });
    expect(loadTextStyle()).toEqual({ ...DEFAULT_TEXT_STYLE, font: "sans", fontSize: 24 });
  });

  it("ignores broken stored values", () => {
    localStorage.setItem("vilekh_textbox_style", "{oops");
    expect(loadTextStyle()).toEqual(DEFAULT_TEXT_STYLE);
  });
});
