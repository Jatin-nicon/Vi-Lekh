import { describe, expect, it } from "vitest";
import { DIFF_ATTR, markChanges } from "./block-diff";

const mk = (html: string) => {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
};

describe("markChanges", () => {
  it("marks a changed paragraph on both sides and an added section on the after side", () => {
    const before = mk(`<main><section><h2>A</h2><p>One</p><p>Two</p></section></main>`);
    const after = mk(`<main><section><h2>A</h2><p>One edited</p><p>Two</p><section class="x"><h3>New</h3><p>Added text</p></section></section></main>`);
    expect(markChanges(before, after)).toBe(3);
    expect(before.querySelectorAll("p")[0].getAttribute(DIFF_ATTR)).toBe("changed");
    expect(after.querySelectorAll("p")[0].getAttribute(DIFF_ATTR)).toBe("changed");
    expect(after.querySelector("h3")!.getAttribute(DIFF_ATTR)).toBe("added");
    expect(after.querySelectorAll("p")[1].hasAttribute(DIFF_ATTR)).toBe(false);
  });

  it("finds no changes in identical content and marks removals on the before side", () => {
    expect(markChanges(mk("<p>a</p><p>b</p>"), mk("<p>a</p><p>b</p>"))).toBe(0);
    const before = mk("<p>a</p><p>b</p><p>c</p>");
    expect(markChanges(before, mk("<p>a</p><p>c</p>"))).toBe(1);
    expect(before.querySelectorAll("p")[1].getAttribute(DIFF_ATTR)).toBe("removed");
  });
});
