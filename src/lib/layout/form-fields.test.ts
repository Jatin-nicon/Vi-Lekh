import { beforeEach, describe, expect, it, vi } from "vitest";
import { bindFormFields } from "./form-fields";

const HTML = `<input data-k="name"><textarea data-k="t1"></textarea><input type="checkbox" data-k="c"><input type="password">
  <input type="radio" name="r" value="a"><input type="radio" name="r" value="b">`;

function mount(html = HTML) {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.replaceChildren(root);
  return root;
}
const type = (el: Element, value: string) => {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("bindFormFields", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    });
  });

  it("saves answers, restores them, and mirrors them into the markup", () => {
    const a = mount();
    bindFormFields(a, "n1");
    type(a.querySelector("[data-k=name]")!, "Asha");
    type(a.querySelector("[data-k=t1]")!, "two\nlines <b>");
    (a.querySelector("[data-k=c]") as HTMLInputElement).click();
    expect(a.innerHTML).toContain('value="Asha"');
    expect(a.innerHTML).toContain("two\nlines &lt;b&gt;</textarea>");

    const b = mount();
    bindFormFields(b, "n1");
    expect((b.querySelector("[data-k=name]") as HTMLInputElement).value).toBe("Asha");
    expect((b.querySelector("[data-k=t1]") as HTMLTextAreaElement).value).toBe("two\nlines <b>");
    expect((b.querySelector("[data-k=c]") as HTMLInputElement).checked).toBe(true);
  });

  it("keeps notes separate and restores the chosen radio", () => {
    const a = mount();
    bindFormFields(a, "n1");
    (a.querySelector("[value=b]") as HTMLInputElement).click();
    (a.querySelector("[value=a]") as HTMLInputElement).click();
    const b = mount();
    bindFormFields(b, "n1");
    expect((b.querySelector("[value=a]") as HTMLInputElement).checked).toBe(true);
    const c = mount();
    bindFormFields(c, "n2");
    expect((c.querySelector("[value=a]") as HTMLInputElement).checked).toBe(false);
  });

  it("is read-only without a key and never enables password fields", () => {
    const a = mount();
    bindFormFields(a);
    expect((a.querySelector("textarea") as HTMLTextAreaElement).readOnly).toBe(true);
    const b = mount();
    bindFormFields(b, "n1");
    expect((b.querySelector("[type=password]") as HTMLInputElement).disabled).toBe(true);
  });

  it("does not treat leaving a field as an edit", () => {
    const a = mount();
    bindFormFields(a, "n1");
    const seen = vi.fn();
    window.addEventListener("vilekh-fields-changed", seen);
    const name = a.querySelector("[data-k=name]")!;
    type(name, "Asha");
    const t1 = JSON.parse(localStorage.getItem("n1:t")!)["k:name"];
    name.dispatchEvent(new Event("change", { bubbles: true }));
    a.querySelector("textarea")!.dispatchEvent(new Event("change", { bubbles: true }));
    window.removeEventListener("vilekh-fields-changed", seen);
    expect(seen).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("n1:t")!)).toEqual({ "k:name": t1 });
  });

    it("stops typing from reaching page shortcuts", () => {
    const a = mount();
    bindFormFields(a, "n1");
    const seen = vi.fn();
    window.addEventListener("keydown", seen);
    a.querySelector("textarea")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    window.removeEventListener("keydown", seen);
    expect(seen).not.toHaveBeenCalled();
  });
});
