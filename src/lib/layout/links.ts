/**
 * Links in notes: web addresses readers type become clickable, and every link
 * opens in a new tab so the reader never leaves the note.
 */

export interface TextPart {
  text: string;
  /** Set when the text is a web address. */
  href?: string;
}

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING = /[.,;:!?'")\]}]+$/;

/** Splits text into plain parts and web addresses (http, https, www.). */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    let url = m[0];
    const trail = TRAILING.exec(url)?.[0] ?? "";
    // Keep a closing bracket that belongs to the address, e.g. ".../Foo_(bar)".
    const keepParen = trail.startsWith(")") && url.slice(0, -trail.length).includes("(");
    const cut = keepParen ? trail.slice(1).length : trail.length;
    if (cut) url = url.slice(0, -cut);
    if (url.length < 5) continue;
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: url, href: /^www\./i.test(url) ? `https://${url}` : url });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export const hasLink = (text: string) => splitLinks(text).some((p) => p.href);

/** Opens a link in a new tab without giving the page access to this one. */
export function openLink(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

/** Only web and mail links are opened; anything else (javascript:, data:) is ignored. */
export function isSafeHref(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href.trim());
}

export const OVERLAY_ATTR = "data-vl-overlay";

type Field = HTMLInputElement | HTMLTextAreaElement;

/** Copied so the overlay's text sits exactly where the field draws it. */
const MIRRORED = [
  "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "word-spacing",
  "text-align", "text-indent", "text-transform", "color", "padding-top", "padding-right", "padding-bottom",
  "padding-left", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "box-sizing", "direction",
];

/**
 * In `root` (the note's flow), clicks on links open in a new tab and
 * same-page anchors scroll inside the note. Text fields whose answer contains
 * a web address show it as a link while they are not being edited. Call
 * `refresh` after the layout changes. Returns `{ refresh, cleanup }`.
 */
export function bindLinks(root: HTMLElement) {
  const doc = root.ownerDocument;
  const overlays = new Map<Field, HTMLElement>();

  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !root.contains(a)) return;
    const href = a.getAttribute("href") ?? "";
    e.preventDefault();
    if (href.startsWith("#")) {
      const id = decodeURIComponent(href.slice(1));
      const target = id ? root.querySelector(`[id="${CSS.escape(id)}"]`) ?? root.querySelector(`[name="${CSS.escape(id)}"]`) : null;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const url = a.href;
    if (isSafeHref(url)) openLink(url);
  };

  const remove = (field: Field) => {
    overlays.get(field)?.remove();
    overlays.delete(field);
    field.style.removeProperty("color");
  };

  const place = (field: Field) => {
    remove(field);
    if (!(field.tagName === "TEXTAREA" || field.type === "text" || field.type === "url" || field.type === "")) return;
    if (field === (root.getRootNode() as Document | ShadowRoot).activeElement || !hasLink(field.value)) return;
    const box = field.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const origin = root.getBoundingClientRect();
    const scale = origin.width / (root.offsetWidth || 1) || 1;
    const cs = getComputedStyle(field);
    const overlay = doc.createElement("div");
    overlay.setAttribute(OVERLAY_ATTR, "");
    overlay.setAttribute("aria-hidden", "true");
    for (const p of MIRRORED) overlay.style.setProperty(p, cs.getPropertyValue(p));
    Object.assign(overlay.style, {
      position: "absolute",
      left: `${(box.left - origin.left) / scale}px`,
      top: `${(box.top - origin.top) / scale}px`,
      width: `${box.width / scale}px`,
      height: `${box.height / scale}px`,
      margin: "0",
      borderStyle: "solid",
      borderColor: "transparent",
      background: "none",
      overflow: "hidden",
      whiteSpace: field.tagName === "TEXTAREA" ? "pre-wrap" : "pre",
      overflowWrap: field.tagName === "TEXTAREA" ? "break-word" : "normal",
      pointerEvents: "none",
      zIndex: "1",
    });
    for (const part of splitLinks(field.value)) {
      if (!part.href) {
        overlay.append(part.text);
        continue;
      }
      const a = doc.createElement("a");
      a.href = part.href;
      a.textContent = part.text;
      a.style.cssText = "pointer-events:auto;color:inherit;text-decoration:underline;cursor:pointer";
      overlay.append(a);
    }
    // The overlay draws the text; the field keeps its lines, box and caret.
    field.style.setProperty("color", "transparent", "important");
    root.append(overlay);
    overlays.set(field, overlay);
  };

  const fields = () => Array.from(root.querySelectorAll<Field>("textarea, input"));
  const refresh = () => fields().forEach(place);
  const onFocus = (e: FocusEvent) => {
    const f = e.target as Field;
    if (overlays.has(f)) remove(f);
  };
  const onBlur = (e: FocusEvent) => {
    const f = e.target as Field;
    if (/^(INPUT|TEXTAREA)$/.test(f.tagName)) place(f);
  };

  root.addEventListener("click", onClick);
  root.addEventListener("focusin", onFocus);
  root.addEventListener("focusout", onBlur);
  return {
    refresh,
    cleanup() {
      root.removeEventListener("click", onClick);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onBlur);
      for (const f of [...overlays.keys()]) remove(f);
    },
  };
}
