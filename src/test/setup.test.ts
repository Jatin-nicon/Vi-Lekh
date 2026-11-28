import { describe, expect, it } from "vitest";

describe("test tooling", () => {
  it("runs under jsdom", () => {
    expect(typeof DOMParser).toBe("function");
  });
});
