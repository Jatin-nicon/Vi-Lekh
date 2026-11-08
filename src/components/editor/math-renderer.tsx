"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function MathRenderer({ latex, displayMode = false, className = "" }: MathRendererProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
      });
    } catch (err) {
      console.error("KaTeX render error:", err);
      return `<span class="text-rose-500 font-mono text-sm">${latex}</span>`;
    }
  }, [latex, displayMode]);

  return (
    <span
      className={`inline-block select-text ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

