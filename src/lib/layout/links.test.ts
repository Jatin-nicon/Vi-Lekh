import { describe, expect, it, vi } from "vitest";
import { bindLinks, hasLink, isSafeHref, splitLinks } from "./links";

describe("splitLinks", () => {
  it("finds web addresses and leaves the rest as text", () => {
    expect(splitLinks("See https://git-scm.com/book, and www.example.com.")).toEqual([
      { text: "See " },
      { text: "https://git-scm.com/book", href: "https://git-scm.com/book" },
      { text: ", and " },
      { text: "www.example.com", href: "https://www.example.com" },
      { text: "." },
    ]);
  });

  it("keeps brackets that belong to the address", () => {
    expect(splitLinks("(https://en.wikipedia.org/wiki/Foo_(bar))")[1].href).toBe("https://en.wikipedia.org/wiki/Foo_(bar)");
  });

  it("ignores text without addresses and unsafe schemes", () => {
    expect(hasLink("just a note, e.g. foo.bar")).toBe(false);
    expect(hasLink("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("https://a.b")).toBe(true);
  });
});

describe("bindLinks", () => {
  it("opens note links in a new tab and never runs javascript: links", () => {
    const root = document.createElement("div");
    root.innerHTML = `<a id="w" href="https://example.com/x">x</a><a id="j" href="javascript:alert(1)">j</a>`;
    document.body.replaceChildren(root);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const { cleanup } = bindLinks(root);
    const w = new MouseEvent("click", { bubbles: true, cancelable: true });
    root.querySelector("#w")!.dispatchEvent(w);
    const j = new MouseEvent("click", { bubbles: true, cancelable: true });
    root.querySelector("#j")!.dispatchEvent(j);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("https://example.com/x", "_blank", "noopener,noreferrer");
    expect(w.defaultPrevented && j.defaultPrevented).toBe(true);
    cleanup();
    open.mockRestore();
  });
});
