/**
 * Bundled note fonts (design D2). Self-hosted under /public/fonts so line
 * breaks are identical on every device.
 *
 * `@font-face` rules declared inside a shadow root are ignored by Chromium,
 * so the faces are registered once on the document (`ensureNoteFonts`) and
 * the shadow-root CSS refers to them by family name.
 */

export const NOTE_SERIF = '"Vi-Lekh Serif"';
export const NOTE_SANS = '"Vi-Lekh Sans"';
export const NOTE_MONO = '"Vi-Lekh Mono"';
/** Handwriting face (Caveat) used by imported lesson notes. */
export const NOTE_HAND = '"Vi-Lekh Hand"';

export const NOTE_BODY_STACK = `${NOTE_SERIF}, Georgia, serif`;
export const NOTE_HEADING_STACK = `${NOTE_SANS}, system-ui, sans-serif`;
export const NOTE_MONO_STACK = `${NOTE_MONO}, ui-monospace, monospace`;

/** Families that lay out identically everywhere (bundled, or generic keywords that map to them). */
export const BUNDLED_FONT_FAMILIES = [
  "vi-lekh serif",
  "vi-lekh sans",
  "vi-lekh mono",
  "vi-lekh hand",
  // KaTeX ships its own fonts.
  "katex_main",
  "katex_math",
  "katex_ams",
  "katex_size1",
  "katex_size2",
  "katex_size3",
  "katex_size4",
  // CSS-wide keywords are not font choices.
  "inherit",
  "initial",
  "unset",
  "revert",
];

const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

const FAMILIES: { family: string; file: string; weight: string; italic?: false }[] = [
  { family: NOTE_SERIF, file: "source-serif-4", weight: "200 900" },
  { family: NOTE_SANS, file: "inter", weight: "100 900" },
  { family: NOTE_MONO, file: "jetbrains-mono", weight: "100 800" },
  { family: NOTE_HAND, file: "caveat", weight: "400 700", italic: false },
];

export const NOTE_FONT_FACE_CSS = FAMILIES.flatMap(({ family, file, weight, italic }) =>
  (italic === false ? (["normal"] as const) : (["normal", "italic"] as const)).flatMap((style) =>
    (
      [
        ["latin-ext", LATIN_EXT],
        ["latin", LATIN],
      ] as const
    ).map(
      ([subset, range]) => `@font-face {
  font-family: ${family};
  font-style: ${style};
  font-display: block;
  font-weight: ${weight};
  src: url(/fonts/${file}-${subset}-wght-${style}.woff2) format("woff2-variations"), url(/fonts/${file}-${subset}-wght-${style}.woff2) format("woff2");
  unicode-range: ${range};
}`,
    ),
  ),
).join("\n");

const STYLE_ID = "vilekh-note-fonts";

/** Registers the bundled note fonts on the document (idempotent). */
export function ensureNoteFonts(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = NOTE_FONT_FACE_CSS;
  doc.head.appendChild(style);
}

/**
 * Resolves once the bundled faces used by the page are loaded, so pagination
 * measures final glyph metrics.
 */
export async function loadNoteFonts(doc: Document = document): Promise<void> {
  ensureNoteFonts(doc);
  if (!doc.fonts) return;
  await Promise.allSettled([
    doc.fonts.load(`400 16px ${NOTE_SERIF}`),
    doc.fonts.load(`italic 400 16px ${NOTE_SERIF}`),
    doc.fonts.load(`700 16px ${NOTE_SANS}`),
    doc.fonts.load(`400 16px ${NOTE_MONO}`),
    doc.fonts.load(`400 16px ${NOTE_HAND}`),
  ]);
  await doc.fonts.ready;
}
