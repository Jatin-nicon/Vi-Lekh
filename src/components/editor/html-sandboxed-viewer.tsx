"use client";

import React, { useRef, useEffect, useState } from "react";

interface HtmlSandboxedViewerProps {
  html: string;
  className?: string;
  theme?: "light" | "dark";
}

const BASE_SANDBOX_CSS = `
  :host {
    display: block;
    width: 100%;
    color: var(--foreground, #2D2926);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }

  .sandbox-container {
    width: 100%;
    color: inherit;
  }

  /* Default Typography */
  h1, h2, h3, h4, h5, h6 {
    color: inherit;
    font-weight: 700;
    line-height: 1.3;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
  h4 { font-size: 1.1rem; }
  p {
    margin-top: 0;
    margin-bottom: 1.25rem;
    line-height: 1.75;
  }
  a {
    color: #A85D44;
    text-decoration: underline;
  }
  ul, ol {
    margin: 1rem 0 1.25rem 1.5rem;
    padding: 0;
  }
  li {
    margin-bottom: 0.35rem;
  }
  blockquote {
    margin: 1.25rem 0;
    padding-left: 1rem;
    border-left: 3px solid #E8E3D9;
    color: #757069;
    font-style: italic;
  }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
    background-color: rgba(120, 110, 100, 0.08);
    padding: 0.15em 0.35em;
    border-radius: 4px;
  }
  pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background-color: #21201E;
    color: #FAF8F5;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.25rem 0;
  }
  pre code {
    background-color: transparent;
    padding: 0;
    color: inherit;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    font-size: 0.9rem;
  }
  th, td {
    padding: 0.65rem 0.85rem;
    border: 1px solid #E8E3D9;
    text-align: left;
  }
  th {
    background-color: rgba(120, 110, 100, 0.08);
    font-weight: 600;
  }
  img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }

  /* Educational Callouts */
  .callout {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    margin: 1.5rem 0;
    border: 1px solid #E8E3D9;
    background-color: #F7F4EB;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .callout-icon {
    font-size: 1.2rem;
    line-height: 1.3;
    flex-shrink: 0;
  }
  .callout-body {
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  /* Pinned Note / Mantra */
  .pinned-note {
    margin: 1.75rem 0;
    border-radius: 0.875rem;
    background-color: #FEF9E7;
    border: 1px solid #F6E05E;
    padding: 1.25rem;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pinned-header {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #975A16;
    margin-bottom: 0.5rem;
  }
  .pinned-content {
    font-size: 0.9375rem;
    font-style: italic;
    line-height: 1.6;
  }

  /* Concept Cards Grid */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin: 1.75rem 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .concept-card {
    border-radius: 0.75rem;
    border: 1px solid #E8E3D9;
    background-color: #FAF8F5;
    padding: 1rem 1.25rem;
  }
  .concept-card.card-danger {
    border-color: #FEB2B2;
    background-color: #FFF5F5;
  }
  .concept-card.card-success {
    border-color: #C6F6D5;
    background-color: #F0FFF4;
  }
  .concept-card.card-exercise {
    border-style: dashed;
    border-color: #CBD5E0;
    background-color: #F7FAFC;
  }
  .concept-card h4 {
    margin: 0.25rem 0 0.5rem 0;
    font-size: 0.95rem;
  }
  .concept-card p {
    font-size: 0.85rem;
    margin-bottom: 0;
  }

  /* Process Flow Steps */
  .process-flow {
    margin: 1.75rem 0;
    padding: 1.25rem;
    border-radius: 0.875rem;
    border: 1px solid #E8E3D9;
    background-color: #FAF8F5;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .process-flow h4 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }
  .flow-steps {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  @media (min-width: 640px) {
    .flow-steps {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .flow-step {
      flex: 1;
      min-width: 140px;
    }
  }
  .flow-step {
    border-radius: 0.625rem;
    border: 1px solid #E8E3D9;
    background-color: #FFFFFF;
    padding: 0.875rem;
  }
  .flow-step.highlighted {
    background-color: #FEF9E7;
    border-color: #F6E05E;
  }
  .flow-step strong {
    display: block;
    font-size: 0.85rem;
    margin: 0.25rem 0;
  }
  .flow-step p {
    font-size: 0.78rem;
    color: #757069;
    margin: 0;
  }

  /* Worksheet Reflection Note */
  .your-note {
    margin: 1.75rem 0;
    padding: 1.25rem;
    border-radius: 0.875rem;
    border: 1px solid #E8E3D9;
    background-color: #FAF8F5;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .note-header {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #5D7063;
    margin-bottom: 0.5rem;
  }
  .note-prompt {
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 1rem;
  }
  .rule-lines {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .rule-line {
    border-bottom: 1px dashed #D5CEBF;
    height: 1.25rem;
  }

  /* Dark mode overrides */
  .dark {
    color: #E3DFD7;
  }
  .dark blockquote {
    border-color: #33312E;
    color: #948F86;
  }
  .dark th, .dark td {
    border-color: #33312E;
  }
  .dark th {
    background-color: #292825;
  }
  .dark .callout {
    border-color: #33312E;
    background-color: #1F1E1C;
  }
  .dark .pinned-note {
    background-color: #2A261A;
    border-color: rgba(180, 130, 40, 0.4);
  }
  .dark .concept-card {
    border-color: #33312E;
    background-color: #1E1C1B;
  }
  .dark .process-flow {
    border-color: #33312E;
    background-color: #1E1C1B;
  }
  .dark .flow-step {
    border-color: #33312E;
    background-color: #252321;
  }
  .dark .flow-step.highlighted {
    background-color: #2A261A;
    border-color: rgba(180, 130, 40, 0.4);
  }
  .dark .your-note {
    border-color: #33312E;
    background-color: #1E1C1B;
  }
  .dark .rule-line {
    border-color: #3E3B37;
  }

  /* Print isolation */
  @media print {
    :host {
      color: #000000 !important;
      background: transparent !important;
    }
    .sandbox-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #000000 !important;
      break-after: avoid;
      page-break-after: avoid;
    }
    .callout, .pinned-note, .concept-card, .process-flow, .your-note, .katex-display {
      break-inside: avoid;
      page-break-inside: avoid;
      box-shadow: none !important;
    }
  }
`;

export function HtmlSandboxedViewer({
  html,
  className = "",
  theme,
}: HtmlSandboxedViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Attach Shadow DOM root if not already attached
    if (!shadowRootRef.current) {
      shadowRootRef.current =
        containerRef.current.shadowRoot ||
        containerRef.current.attachShadow({ mode: "open" });
    }

    const shadow = shadowRootRef.current;
    if (!shadow) return;

    // Determine active theme
    const isDark =
      theme === "dark" ||
      (!theme &&
        typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark"));

    // Prepare KaTeX and Fonts inside Shadow DOM
    const katexLink = `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />`;
    const styleBlock = `<style>${BASE_SANDBOX_CSS}</style>`;

    shadow.innerHTML = `
      ${katexLink}
      ${styleBlock}
      <div class="sandbox-container ${isDark ? "dark" : ""}">
        ${html || ""}
      </div>
    `;
  }, [html, theme, isClient]);

  return (
    <div
      ref={containerRef}
      className={`html-sandboxed-viewer-host w-full ${className}`}
    />
  );
}

