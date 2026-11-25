import { describe, expect, it } from "vitest";
import { computeSlices } from "./document-slices";

describe("computeSlices", () => {
  it("keeps a short document on one page", () => {
    expect(computeSlices([], 500, 1000)).toEqual([{ top: 0, height: 500 }]);
  });

  it("cuts above a block that would be split", () => {
    const s = computeSlices([{ top: 0, bottom: 800 }, { top: 850, bottom: 1100 }], 1500, 1000);
    expect(s).toEqual([{ top: 0, height: 850 }, { top: 850, height: 650 }]);
  });

  it("moves a trailing heading to the next page", () => {
    const s = computeSlices(
      [{ top: 400, bottom: 800 }, { top: 900, bottom: 940, heading: true }, { top: 960, bottom: 1200 }],
      1500,
      1000,
    );
    expect(s[1].top).toBe(900);
  });

  it("drops a last page with no content", () => {
    expect(computeSlices([{ top: 0, bottom: 500 }, { top: 500, bottom: 1000 }], 1030, 1000)).toHaveLength(1);
  });

  it("cuts through blocks taller than a page and always covers everything", () => {
    const s = computeSlices([{ top: 0, bottom: 3000 }, { top: 2900, bottom: 3000 }], 3000, 1000);
    expect(s.map((x) => x.top)).toEqual([0, 1000, 2000]);
    expect(s.reduce((n, x) => n + x.height, 0)).toBe(3000);
  });
});
