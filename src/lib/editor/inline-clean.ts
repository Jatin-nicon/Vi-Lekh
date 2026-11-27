import { paletteStyle } from "./format-palette";

/**
 * Cleaning of markup typed or pasted into a block on the page (design D3).
 * Only simple inline formatting survives; anything else keeps its text.
 * Spans and marks may keep a palette colour (design D11).
 */

/** Inline tags allowed in an edited block, and the attributes each may keep. */
const ALLOWED: Record<string, string[]> = {
  b: ["class"], strong: ["class"], i: ["class"], em: ["class"], u: ["class"], s: [], small: ["class"],
  code: ["class"], sub: [], sup: [], mark: ["class", "style"], span: ["class", "style"], a: ["href", "class"], br: [],
};
const DROP_WITH_CONTENT = new Set(["script", "style", "template", "iframe", "object", "embed", "svg", "math", "noscript"]);
const SAFE_HREF = /^(https?:|mailto:)/i;

/** True when every element inside `el` is allowed inline markup (so the block can be edited on the page). */
export function isInlineOnly(el: Element): boolean {
  return Array.from(el.querySelectorAll("*")).every((c) => {
    const tag = c.tagName.toLowerCase();
    const allowed = ALLOWED[tag];
    return (
      allowed !== undefined &&
      Array.from(c.attributes).every((a) => allowed.includes(a.name) && (a.name !== "style" || paletteStyle(tag, a.value).clean))
    );
  });
}

/** Returns the cleaned inner HTML of an edited block. */
export function cleanInline(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const clean = (parent: Node) => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 8) {
        node.remove();
        continue;
      }
      if (node.nodeType !== 1) continue;
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (DROP_WITH_CONTENT.has(tag)) {
        el.remove();
        continue;
      }
      clean(el);
      const allowed = ALLOWED[tag];
      if (allowed === undefined) {
        // Block elements from the browser's editing become line breaks; other tags are unwrapped.
        const isBlock = /^(div|p|li|h[1-6]|blockquote|section|article|tr)$/.test(tag);
        const parentEl = el.parentNode!;
        if (isBlock && el.previousSibling) parentEl.insertBefore(doc.createElement("br"), el);
        while (el.firstChild) parentEl.insertBefore(el.firstChild, el);
        el.remove();
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const keep = allowed.includes(attr.name) && !(attr.name === "href" && !SAFE_HREF.test(attr.value.trim()));
        if (!keep) el.removeAttribute(attr.name);
        else if (attr.name === "style") {
          const { style } = paletteStyle(tag, attr.value);
          if (style) el.setAttribute("style", style);
          else el.removeAttribute("style");
        }
      }
      if (tag === "a" && !el.hasAttribute("href")) {
        while (el.firstChild) el.parentNode!.insertBefore(el.firstChild, el);
        el.remove();
      } else if (tag !== "br" && !el.textContent && !el.querySelector("br")) {
        el.remove();
      }
    }
  };
  clean(doc.body);
  // A trailing <br> the browser adds to keep an empty line open is not content.
  return doc.body.innerHTML.replace(/(<br>)+$/, "").replace(/&nbsp;/g, " ");
}
