import katex from "katex";

/**
 * Searches for LaTeX math delimiters ($$ ... $$ for display math,
 * and $ ... $ or \( ... \) for inline math) inside HTML text,
 * rendering them with KaTeX without corrupting surrounding HTML tags.
 */
export function renderMathInHtml(rawHtml: string): string {
  if (!rawHtml) return "";

  // 1. Display math: $$ ... $$
  let processed = rawHtml.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
    try {
      return `<div class="my-4 py-2 text-center overflow-x-auto select-text">${katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
      })}</div>`;
    } catch {
      return `$$${latex}$$`;
    }
  });

  // 2. Inline math: \( ... \)
  processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `\\(${latex}\\)`;
    }
  });

  // 3. Inline math: $ ... $ (avoiding currency $100 or double $$)
  processed = processed.replace(/(?<![\\$])\$([^\n$]+?)\$(?!\$)/g, (_, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `$${latex}$`;
    }
  });

  return processed;
}

