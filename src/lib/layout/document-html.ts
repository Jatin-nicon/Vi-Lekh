/**
 * Renders complete HTML documents (`<!doctype html><html>…`) inside the note
 * viewer without changing the stored HTML. At display time only:
 *  - the document's styles are scoped to a `.vl-doc` wrapper that stands for
 *    html/body, and the app's own note styles are reset inside it;
 *  - its on-screen design is shown as one continuous page, laid out at a fixed
 *    desktop width (DOCUMENT_WIDTH) and scaled to fit, so line breaks and
 *    annotations don't move between devices; breakpoints and viewport units
 *    are evaluated at that fixed size;
 *  - well-known web fonts map to the bundled copies (design D2);
 *  - scripts, event handlers and external stylesheets are dropped.
 *
 * Requires a DOM (`DOMParser`).
 */

/** Fixed layout size of a complete document, in CSS px. */
export const DOCUMENT_WIDTH = 1104;
const DOCUMENT_VIEW_HEIGHT = 900;

/** True when the HTML is a complete document rather than a note fragment. */
export function isHtmlDocument(html: string): boolean {
  return /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\s+html|html)[\s>]/i.test(html ?? "");
}

/** Web fonts that have a bundled copy, by lowercase name. */
export const FONT_ALIASES: Record<string, string> = {
  "source serif 4": "Vi-Lekh Serif",
  "source serif pro": "Vi-Lekh Serif",
  inter: "Vi-Lekh Sans",
  "jetbrains mono": "Vi-Lekh Mono",
  "ui-monospace": "Vi-Lekh Mono",
  caveat: "Vi-Lekh Hand",
};

/** Maps font names to bundled families in a CSS value (a font list). */
function aliasFonts(value: string): string {
  return value
    .split(",")
    .map((part) => {
      const name = part.trim().replace(/^(["'])(.*)\1$/, "$2").toLowerCase();
      if (FONT_ALIASES[name]) return part.replace(/\S(?:.*\S)?/, `'${FONT_ALIASES[name]}'`);
      // `font` shorthand: the family follows the size.
      return part.replace(/(\d(?:px|pt|em|rem|%)(?:\/[\d.]+\w*)?\s+)(["']?)([\w][\w -]*?)\2(\s*)$/, (m, size, _q, n, end) =>
        FONT_ALIASES[n.toLowerCase()] ? `${size}'${FONT_ALIASES[n.toLowerCase()]}'${end}` : m,
      );
    })
    .join(",");
}

function aliasDeclarations(body: string): string {
  return body.replace(
    /((?:^|[;{\s])(?:font|font-family|--[\w-]+)\s*:)([^;{}]*)/gi,
    (_m, prop, value) => prop + aliasFonts(value),
  );
}

// ---------------------------------------------------------------------------
// CSS scoping
// ---------------------------------------------------------------------------

/** Repeated so document rules outrank the app's note styles and the reset. */
const ROOT = ".vl-doc.vl-doc.vl-doc.vl-doc";

/** Splits at top-level commas (outside strings, brackets and parentheses). */
function splitList(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") current += text[i++];
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      out.push(current);
      current = "";
      continue;
    }
    current += text[i] ?? "";
  }
  out.push(current);
  return out.map((s) => s.trim()).filter(Boolean);
}

function scopeSelector(selector: string): string {
  const root = /^(?:(?:html|:root)(?![\w-])\s*>?\s*)?(?:body|html|:root)(?![\w-])/i;
  return splitList(selector)
    .map((s) => (root.test(s) ? s.replace(root, ROOT) : `${ROOT} ${s}`))
    .join(",");
}

const PX: Record<string, number> = { px: 1, pt: 96 / 72, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, em: 16, rem: 16 };

function toPx(length: string): number | null {
  const m = /^(-?\d*\.?\d+)(px|pt|mm|cm|in|em|rem)?$/i.exec(length.trim());
  if (!m) return null;
  if (!m[2]) return Number(m[1]) === 0 ? 0 : null;
  return Number(m[1]) * PX[m[2].toLowerCase()];
}

/** Whether a media query list applies on screen at the fixed document width. */
export function mediaApplies(query: string): boolean {
  return splitList(query.toLowerCase()).some((q) => {
    if (/^(?:only\s+)?(?:print|speech)\b/.test(q) || /^not\s+(?:screen|all)\b/.test(q)) return false;
    let ok = true;
    for (const [, feature, value] of q.matchAll(/\(\s*([\w-]+)\s*(?::\s*([^)]+))?\)/g)) {
      const px = value ? toPx(value) : null;
      if (feature === "max-width") ok = ok && px !== null && DOCUMENT_WIDTH <= px;
      else if (feature === "min-width") ok = ok && px !== null && DOCUMENT_WIDTH >= px;
      else if (feature === "orientation") ok = ok && value?.trim() === "landscape";
      else if (feature === "prefers-color-scheme") ok = ok && value?.trim() === "light";
      else ok = false;
    }
    // Range syntax and other features this does not understand don't apply.
    if (/[<>]/.test(q)) ok = false;
    return ok;
  });
}

/** Viewport units would change the layout with the window; pin them. */
function fixedUnits(body: string): string {
  return body.replace(/(-?\d*\.?\d+)(?:[sld]?)(vh|vw)\b/gi, (_m, n, unit) => {
    const full = unit.toLowerCase() === "vw" ? DOCUMENT_WIDTH : DOCUMENT_VIEW_HEIGHT;
    return `${Math.round(Number(n) * full) / 100}px`;
  });
}

/** Index of the `}` that closes the block opened at `open`. */
function blockEnd(css: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let i = open; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return css.length;
}

function transformCss(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    // Prelude: up to `{` or `;` (strings may contain either).
    let j = i;
    let quote = "";
    for (; j < css.length; j++) {
      const ch = css[j];
      if (quote) {
        if (ch === "\\") j++;
        else if (ch === quote) quote = "";
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "{" || ch === ";" || ch === "}") break;
    }
    const prelude = css.slice(i, j).trim();
    if (j >= css.length) break;
    if (css[j] !== "{") {
      i = j + 1; // @import, @charset, stray tokens
      continue;
    }
    const end = blockEnd(css, j);
    const body = css.slice(j + 1, end);
    i = end + 1;

    const at = /^@([\w-]+)\s*([\s\S]*)$/.exec(prelude);
    if (!at) {
      if (prelude) out += `${scopeSelector(prelude)}{${fixedUnits(aliasDeclarations(body))}}\n`;
      continue;
    }
    const name = at[1].toLowerCase();
    if (name === "media") {
      if (mediaApplies(at[2])) out += transformCss(body);
    } else if (name === "supports" || name === "layer") {
      out += `${prelude}{${transformCss(body)}}\n`;
    } else if (/keyframes$/.test(name)) {
      out += `${prelude}{${body}}\n`;
    }
    // @page doesn't apply on screen, @font-face is ignored inside shadow roots;
    // anything else is dropped.
  }
  return out;
}

/** App-owned elements that keep the app's styles inside a document. */
const KEEP =
  "svg,svg *,[data-vl-page-spacer],.vl-contribution,.vl-contribution *,.vl-figure,.vl-figure *,.vl-diff,.vl-diff-old,.vl-diff-new,.vl-diff ins,.vl-diff del";

/** Fields keep their size, so content and annotations below them don't move. */
const FIELD_CSS = `${ROOT} textarea{resize:none!important}\n`;

const URL_ATTRS = new Set(["href", "src", "xlink:href", "action", "formaction"]);

/** Markup for the viewer: one style element plus the `.vl-doc` wrapper. */
export function prepareDocument(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  let css = "";
  doc.querySelectorAll("style").forEach((el) => {
    const media = el.getAttribute("media");
    const text = (el.textContent ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
    if (!media || mediaApplies(media)) css += transformCss(text);
  });
  doc.querySelectorAll("style,script,link,meta,title,base,noscript").forEach((el) => el.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const { name, value } of Array.from(el.attributes)) {
      if (/^on/i.test(name) || (URL_ATTRS.has(name.toLowerCase()) && /^[\s\u0000-\u001f]*javascript:/i.test(value))) {
        el.removeAttribute(name);
      } else if (name === "style") {
        el.setAttribute(name, fixedUnits(aliasDeclarations(value)));
      } else if (name === "font-family") {
        el.setAttribute(name, aliasFonts(value));
      }
    }
  });

  const base = `
.vl-doc.vl-doc.vl-doc :where(:not(${KEEP})){all:revert}
.vl-flow{--vl-w:${DOCUMENT_WIDTH}px;--vl-pt:0px;--vl-pr:0px;--vl-pb:0px;--vl-pl:0px}
${ROOT}{display:flow-root;background:#fff;color:#000;font-family:'Vi-Lekh Serif',serif;font-size:16px;line-height:normal;margin:8px}
`;
  const frame = `${ROOT}{min-height:0!important;width:auto!important}\n`;
  const attrs = doc.body.className ? ` ${doc.body.className.replace(/["<>&]/g, "")}` : "";
  const style = `${base}${css}${frame}${FIELD_CSS}`.replace(/<\/style/gi, "<\\/style");
  return `<style>${style}</style><div class="vl-doc${attrs}">${doc.body.innerHTML}</div>`;
}
