/**
 * The colours contributors may use on the page (design D11): mid-tone text
 * colours and see-through highlights that read on light and dark pages.
 */

export const TEXT_COLORS: { name: string; value: string }[] = [
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#9333ea" },
  { name: "Pink", value: "#db2777" },
];

export const HIGHLIGHTS: { name: string; value: string }[] = [
  { name: "Yellow", value: "rgba(250, 204, 21, 0.4)" },
  { name: "Green", value: "rgba(74, 222, 128, 0.4)" },
  { name: "Blue", value: "rgba(96, 165, 250, 0.4)" },
  { name: "Pink", value: "rgba(244, 114, 182, 0.4)" },
];

const squash = (v: string) => v.toLowerCase().replace(/\s+/g, "");
const TEXT = new Set(TEXT_COLORS.map((c) => squash(c.value)));
const BACKGROUND = new Set(HIGHLIGHTS.map((c) => squash(c.value)));

/** The style property a tag may carry, if any: `color` on spans, `background-color` on marks. */
export const PALETTE_PROPERTY: Record<string, "color" | "background-color"> = { span: "color", mark: "background-color" };

/**
 * Keeps only the palette declaration a tag may carry; returns the cleaned
 * style ("" when nothing is left) and whether anything else was in it.
 */
export function paletteStyle(tag: string, style: string): { style: string; clean: boolean } {
  const property = PALETTE_PROPERTY[tag];
  let kept = "";
  let clean = true;
  for (const decl of style.split(";")) {
    if (!decl.trim()) continue;
    const i = decl.indexOf(":");
    const name = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim();
    const allowed = property === name && (name === "color" ? TEXT : BACKGROUND).has(squash(value));
    if (allowed && !kept) kept = `${name}: ${value}`;
    else clean = false;
  }
  return { style: kept, clean };
}
