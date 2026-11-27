import { describe, expect, it } from "vitest";
import { findBlock, insertionAnchor, startEditing } from "./page-editing";

function mount(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.replaceChildren(root);
  return root;
}

describe("findBlock", () => {
  const root = mount(`<section><h3>Head</h3><p>Para <b>bold</b></p><div class="card"><div class="t">Card text</div></div>
    <p id="svgp">With <svg id="s"></svg> art</p><ul><li id="li">One</li></ul><textarea id="ta"></textarea><div id="empty"><p>x</p></div></section>`);
  const q = (s: string) => root.querySelector(s)!;

  it("edits the text block around the click", () => {
    expect(findBlock(q("p b"), root)).toEqual({ kind: "editable", element: q("p") });
    expect(findBlock(q(".t"), root)).toEqual({ kind: "editable", element: q(".t") });
    expect(findBlock(q("#li"), root)).toEqual({ kind: "editable", element: q("#li") });
  });

  it("does not edit illustrations, fields or containers", () => {
    expect(findBlock(q("#s"), root).kind).toBe("none");
    expect(findBlock(q("#ta"), root).kind).toBe("none");
    expect(findBlock(q("#empty"), root).kind).toBe("none");
    expect(findBlock(q("#svgp"), root)).toEqual({ kind: "uneditable", element: q("#svgp") });
  });

  it("inserts after a whole list, not inside it", () => {
    expect(insertionAnchor(q("#li"), root)).toBe(q("ul"));
    expect(insertionAnchor(q("p"), root)).toBe(q("p"));
  });
});

describe("startEditing", () => {
  it("returns cleaned markup only when the text changed, and can cancel", () => {
    const root = mount(`<p>Hello <b>you</b></p>`);
    const p = root.querySelector("p")!;
    let s = startEditing(p);
    expect(p.getAttribute("contenteditable")).toBe("true");
    expect(s.finish()).toBeNull();
    s = startEditing(p);
    p.innerHTML = `Hello <b onclick="x()">there</b><script>1</script>`;
    expect(s.finish()).toEqual({ inner: "Hello <b>there</b>" });
    expect(p.hasAttribute("contenteditable")).toBe(false);
    p.innerHTML = "Hello <b>there</b>";
    s = startEditing(p);
    p.innerHTML = "changed";
    s.cancel();
    expect(p.innerHTML).toBe("Hello <b>there</b>");
  });

  it("reports alignment changes, and cancelling restores the block's style", () => {
    const root = mount(`<p style="color: red">Text</p>`);
    const p = root.querySelector("p")!;
    let s = startEditing(p);
    p.style.textAlign = "center";
    expect(s.finish()).toEqual({ inner: null, align: "center" });
    s = startEditing(p);
    p.style.textAlign = "";
    expect(s.finish()).toEqual({ inner: null, align: "" });
    p.setAttribute("style", "color: red");
    s = startEditing(p);
    p.style.textAlign = "right";
    s.cancel();
    expect(p.getAttribute("style")).toBe("color: red");
  });

  it("formats with Ctrl+B using the same markup as the bar", () => {
    const root = mount(`<p>make bold</p>`);
    const p = root.querySelector("p")!;
    const s = startEditing(p);
    const r = document.createRange();
    r.setStart(p.firstChild!, 5);
    r.setEnd(p.firstChild!, 9);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(r);
    p.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    expect(s.finish()).toEqual({ inner: "make <b>bold</b>" });
  });
});
