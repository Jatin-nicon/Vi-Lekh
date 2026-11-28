import { BUNDLED_FONT_FAMILIES } from "./note-fonts";
import { FONT_ALIASES, isHtmlDocument } from "./document-html";

/**
 * Finds fonts in authored HTML that are not bundled (design D2). Such fonts
 * resolve differently per device, so line breaks — and the page positions of
 * annotations — can differ between screens.
 *
 * Only the first family of each declaration matters: it is the one a device
 * uses when installed. Generic families (serif, sans-serif, …) are reported
 * too, since they map to different system fonts on each OS.
 */

const BUNDLED = new Set(BUNDLED_FONT_FAMILIES);

const DECLARATION = /(?:^|[;{\s"'])font-family\s*:\s*([^;}<>]+)/gi;
// `font: [style] [weight] <size>[/<line-height>] <family>` — the size needs a unit.
const SHORTHAND =
  /(?:^|[;{\s"'])font\s*:\s*[^;}<>]*?\b\d*\.?\d+(?:px|pt|em|rem|%|ex|ch|vw|vh)(?:\s*\/\s*[^\s;}<>]+)?\s+([^;}<>]+)/gi;

function firstFamily(value: string): string | null {
  const v = value.trim();
  // Quoted name: take the quoted text. Unquoted: up to a comma or a quote
  // (the quote that closes a style="…" attribute).
  const quoted = /^(['"])(.*?)\1/.exec(v);
  const first = (quoted ? quoted[2] : v.split(/[,"']/)[0]).replace(/!important/i, "").trim();
  return first || null;
}

/** Returns the distinct non-bundled first font families used in the HTML. */
export function findUnbundledFonts(html: string): string[] {
  if (!html) return [];
  const source = html.replace(/&quot;/g, '"');
  // Complete documents get these names mapped to bundled fonts when shown.
  const aliased = isHtmlDocument(html);
  const found = new Map<string, string>();
  for (const re of [DECLARATION, SHORTHAND]) {
    re.lastIndex = 0;
    for (let m = re.exec(source); m; m = re.exec(source)) {
      const family = firstFamily(m[1]);
      if (!family || family.startsWith("var(")) continue;
      const key = family.toLowerCase();
      if (aliased && FONT_ALIASES[key]) continue;
      if (!BUNDLED.has(key) && !found.has(key)) found.set(key, family);
    }
  }
  return [...found.values()];
}
