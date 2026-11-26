/**
 * Fill-in fields inside a note (text inputs, text areas, checkboxes, selects).
 * Notes can't run scripts, so the viewer saves what the reader types, on this
 * device. Values are also mirrored into the markup so that PDF export, which
 * copies the markup, includes them.
 */

import { FIELDS_CHANGED_EVENT, FIELDS_UPDATED_EVENT, timesKey } from "./answer-sync";

type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Values = Record<string, string | boolean>;

/** Input types readers may fill in. Others (password, file, …) are disabled. */
const TEXT_TYPES = new Set(["text", "search", "tel", "url", "email", "number", "date", "time", "month", "week", ""]);

export function formFieldsKey(noteId: string): string {
  return `vilekh_html_fields_${noteId}`;
}

const isInput = (f: Element): f is HTMLInputElement => f.tagName === "INPUT";
type ToggleField = HTMLInputElement & { type: "checkbox" | "radio" };
const isToggle = (f: Element): f is ToggleField => isInput(f) && /^(checkbox|radio)$/.test(f.type);

/** Stable key: the author's data-k, id or name, else the position. */
function keyOf(field: Field, index: number): string {
  const radio = isInput(field) && field.type === "radio" ? `=${field.getAttribute("value") ?? index}` : "";
  const own = field.getAttribute("data-k") || field.id || field.getAttribute("name");
  return own ? `k:${own}${radio}` : `i:${index}`;
}

function load(storageKey: string): Values {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Values) : {};
  } catch {
    return {};
  }
}

function mirror(field: Field) {
  if (isToggle(field)) field.toggleAttribute("checked", field.checked);
  else if (field.tagName === "INPUT") field.setAttribute("value", field.value);
  else if (field.tagName === "TEXTAREA") (field as HTMLTextAreaElement).defaultValue = field.value;
  else for (const o of Array.from((field as HTMLSelectElement).options)) o.toggleAttribute("selected", o.selected);
}

/** The editable field under a screen point inside the viewer's shadow root, if any. */
export function fieldAtPoint(shadow: ShadowRoot | null | undefined, x: number, y: number): HTMLElement | null {
  const hit = shadow?.elementsFromPoint(x, y).find((el) => /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  return hit && !(hit as HTMLInputElement).readOnly && !(hit as HTMLInputElement).disabled ? (hit as HTMLElement) : null;
}

/**
 * Restores and saves the fields under `root`. Without a storage key (editor
 * preview, diffs) the fields are read-only. Returns a cleanup function.
 */
export function bindFormFields(root: HTMLElement, storageKey?: string): () => void {
  const fields = Array.from(root.querySelectorAll<Field>("input, textarea, select"));
  const keys = new Map<Field, string>();
  const values = storageKey ? load(storageKey) : {};

  fields.forEach((field, i) => {
    const allowed = !isInput(field) || isToggle(field) || TEXT_TYPES.has(field.type);
    if (!storageKey || !allowed) {
      // Keep the author's look: disabled controls are greyed out by browsers.
      if (isInput(field) && TEXT_TYPES.has(field.type)) field.readOnly = true;
      else if (field.tagName === "TEXTAREA") (field as HTMLTextAreaElement).readOnly = true;
      else field.disabled = true;
      field.tabIndex = -1;
      return;
    }
    const key = keyOf(field, i);
    keys.set(field, key);
    const saved = values[key];
    if (isToggle(field)) {
      if (typeof saved === "boolean") field.checked = saved;
    } else if (typeof saved === "string") field.value = saved;
    mirror(field);
  });

  const onEdit = (e: Event) => {
    const field = e.target as Field;
    const key = keys.get(field);
    if (!key || !storageKey) return;
    // Re-read, so another tab's answers to other fields aren't overwritten.
    const current = load(storageKey);
    const times = load(timesKey(storageKey)) as Record<string, string>;
    const now = new Date().toISOString();
    let changed = false;
    const group = isToggle(field) && field.type === "radio" ? fields.filter((f) => isInput(f) && f.type === "radio" && f.name === (field as HTMLInputElement).name) : [field];
    for (const f of group) {
      const k = keys.get(f);
      if (!k) continue;
      const value = isToggle(f) ? f.checked : f.value;
      mirror(f);
      // "change" also fires on blur; only a new value is an edit.
      if (current[k] === value || (current[k] === undefined && (value === "" || value === false))) continue;
      current[k] = value;
      times[k] = now;
      changed = true;
    }
    if (!changed) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(current));
      localStorage.setItem(timesKey(storageKey), JSON.stringify(times));
    } catch {
      // Ignore storage errors (e.g. quota)
    }
    window.dispatchEvent(new CustomEvent(FIELDS_CHANGED_EVENT, { detail: { storageKey } }));
  };
  // Answers merged in from the account: show them, except in the field being typed in.
  const onUpdated = (e: Event) => {
    if (!storageKey || (e as CustomEvent<{ storageKey: string }>).detail?.storageKey !== storageKey) return;
    const latest = load(storageKey);
    const active = (root.getRootNode() as Document | ShadowRoot).activeElement;
    for (const [field, key] of keys) {
      if (field === active || !(key in latest)) continue;
      const v = latest[key];
      if (isToggle(field)) {
        if (typeof v === "boolean") field.checked = v;
      } else if (typeof v === "string") field.value = v;
      mirror(field);
    }
  };
  // Outside a shadow root the event target is the host, so the reader's
  // shortcuts (delete, undo, tools) can't tell that the user is typing.
  const onKey = (e: Event) => {
    if (keys.has(e.target as Field)) e.stopPropagation();
  };
  const onSubmit = (e: Event) => e.preventDefault();

  root.addEventListener("input", onEdit);
  root.addEventListener("change", onEdit);
  root.addEventListener("keydown", onKey);
  root.addEventListener("submit", onSubmit);
  window.addEventListener(FIELDS_UPDATED_EVENT, onUpdated);
  return () => {
    window.removeEventListener(FIELDS_UPDATED_EVENT, onUpdated);
    root.removeEventListener("input", onEdit);
    root.removeEventListener("change", onEdit);
    root.removeEventListener("keydown", onKey);
    root.removeEventListener("submit", onSubmit);
  };
}
