import { cleanInline, isInlineOnly } from "./inline-clean";

/**
 * Editing a note on the rendered page (design D3): which element a click
 * edits, and making one block at a time editable.
 */

const TEXT_BLOCKS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "DT", "DD", "BLOCKQUOTE", "FIGCAPTION", "CAPTION", "SUMMARY"]);
/** Containers that may hold text directly, like a card's text in a div. */
const TEXT_CONTAINERS = new Set(["DIV", "LABEL", "SPAN", "SMALL"]);
const INERT = "svg, input, textarea, select, button, [data-vl-page-spacer], [data-vl-overlay]";
/** Blocks whose siblings may not be arbitrary sections; insert after the list or table instead. */
const ITEM_PARENTS: Record<string, string> = { LI: "UL,OL", TD: "TABLE", TH: "TABLE", DT: "DL", DD: "DL" };

export type BlockHit = { kind: "editable"; element: HTMLElement } | { kind: "uneditable"; element: HTMLElement } | { kind: "none" };

const hasText = (el: Element) => (el.textContent ?? "").trim().length > 0;

/** The block a click on `target` would edit, if any. */
export function findBlock(target: Element | null, root: Element): BlockHit {
  if (!target || !root.contains(target) || target.closest(INERT)) return { kind: "none" };
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    if (TEXT_BLOCKS.has(el.tagName)) {
      return isInlineOnly(el) && hasText(el) ? { kind: "editable", element: el as HTMLElement } : { kind: "uneditable", element: el as HTMLElement };
    }
    if (TEXT_CONTAINERS.has(el.tagName) && hasText(el) && isInlineOnly(el)) {
      // A span or small is text inside something; edit its text container instead when there is one.
      if ((el.tagName === "SPAN" || el.tagName === "SMALL") && el.parentElement && el.parentElement !== root && isInlineOnly(el.parentElement) && hasText(el.parentElement)) continue;
      return { kind: "editable", element: el as HTMLElement };
    }
    if (el.children.length && !isInlineOnly(el)) {
      // Clicked a container's empty area, or text mixed with blocks.
      const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim());
      return ownText ? { kind: "uneditable", element: el as HTMLElement } : { kind: "none" };
    }
  }
  return { kind: "none" };
}

/** Where new sections go after a block: lists and tables as a whole, not inside them. */
export function insertionAnchor(block: Element, root: Element): Element {
  const parents = ITEM_PARENTS[block.tagName];
  if (!parents) return block;
  let el: Element | null = block.parentElement;
  while (el && el !== root && !parents.split(",").includes(el.tagName)) el = el.parentElement;
  return el && el !== root ? el : block;
}

export interface EditSession {
  element: HTMLElement;
  original: string;
  /** Ends editing; returns the cleaned inner HTML if it changed, else null. */
  finish(): string | null;
  cancel(): void;
}

/** Makes one block editable: Enter adds a line break, paste inserts plain text. */
export function startEditing(element: HTMLElement): EditSession {
  const original = element.innerHTML;
  element.setAttribute("contenteditable", "true");
  element.setAttribute("data-vl-editing", "");
  element.spellcheck = true;
  const doc = element.ownerDocument;
  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      doc.execCommand("insertLineBreak");
    } else if (e.key === "Escape") {
      e.preventDefault();
      session.cancel();
      element.blur();
    }
  };
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") ?? "";
    doc.execCommand("insertText", false, text);
  };
  const onDrop = (e: DragEvent) => e.preventDefault();
  element.addEventListener("keydown", onKey);
  element.addEventListener("paste", onPaste);
  element.addEventListener("drop", onDrop);
  const stop = () => {
    element.removeEventListener("keydown", onKey);
    element.removeEventListener("paste", onPaste);
    element.removeEventListener("drop", onDrop);
    element.removeAttribute("contenteditable");
    element.removeAttribute("data-vl-editing");
  };
  let done = false;
  const session: EditSession = {
    element,
    original,
    finish() {
      if (done) return null;
      done = true;
      stop();
      const next = cleanInline(element.innerHTML);
      return next === cleanInline(original) ? null : next;
    },
    cancel() {
      if (done) return;
      done = true;
      stop();
      element.innerHTML = original;
    },
  };
  return session;
}
