"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, WrapText, Hash, Terminal } from "lucide-react";
import { highlightCode, getLanguageLabel } from "@/lib/syntax/highlighter";

interface NotionCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  defaultWrap?: boolean;
  defaultShowLineNumbers?: boolean;
}

export function NotionCodeBlock({
  code,
  language = "python",
  className = "",
  defaultWrap = false,
  defaultShowLineNumbers = true,
}: NotionCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(defaultWrap);
  const [showLineNumbers, setShowLineNumbers] = useState(defaultShowLineNumbers);

  const cleanCode = code || "";
  const langLabel = getLanguageLabel(language);

  // Split code into lines for gutter
  const lines = useMemo(() => {
    const raw = cleanCode.replace(/\r\n/g, "\n");
    const arr = raw.split("\n");
    // If ending with a newline, preserve count accurately
    return arr.length > 0 ? arr : [""];
  }, [cleanCode]);

  // Highlight full code
  const highlightedHtml = useMemo(() => {
    return highlightCode(cleanCode, language);
  }, [cleanCode, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for clipboard
      const textarea = document.createElement("textarea");
      textarea.value = cleanCode;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`notion-code-block group my-6 overflow-hidden rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors ${className}`}
    >
      {/* Notion Code Block Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#E8E3D9]/70 dark:border-[#33312E]/70 bg-[#F5F2EB]/70 dark:bg-[#181716]/70 select-none text-xs">
        {/* Language Label */}
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#757069] dark:text-[#948F86]">
          <Terminal className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
          <span>{langLabel}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-[11px]">
          {/* Toggle Line Numbers */}
          <button
            type="button"
            onClick={() => setShowLineNumbers((prev) => !prev)}
            title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              showLineNumbers
                ? "bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#2D2926] dark:text-[#E3DFD7] font-medium"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] hover:text-[#2D2926]"
            }`}
          >
            <Hash className="w-3 h-3" />
            <span className="hidden sm:inline">Lines</span>
          </button>

          {/* Toggle Word Wrap */}
          <button
            type="button"
            onClick={() => setWrapLines((prev) => !prev)}
            title={wrapLines ? "Disable word wrap" : "Enable word wrap"}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
              wrapLines
                ? "bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#2D2926] dark:text-[#E3DFD7] font-medium"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] hover:text-[#2D2926]"
            }`}
          >
            <WrapText className="w-3 h-3" />
            <span className="hidden sm:inline">Wrap</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
              copied
                ? "bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] font-medium"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] hover:text-[#2D2926] dark:hover:text-[#E3DFD7]"
            }`}
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="relative flex min-w-0 text-[13px] sm:text-[13.5px] leading-[1.65]">
        {/* Line Numbers Gutter */}
        {showLineNumbers && (
          <div
            aria-hidden="true"
            className="shrink-0 select-none py-3.5 pl-3 pr-3 text-right font-mono text-[11.5px] sm:text-[12px] text-stone-400/70 dark:text-stone-500/60 border-r border-[#E8E3D9]/60 dark:border-[#33312E]/60 bg-[#F5F2EB]/30 dark:bg-[#181716]/30 leading-[1.65]"
          >
            {lines.map((_, i) => (
              <div key={i} className="tabular-nums">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code Content */}
        <pre
          className={`flex-1 overflow-x-auto py-3.5 px-4 font-mono text-[#2D2926] dark:text-[#E3DFD7] m-0 bg-transparent ${
            wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"
          }`}
        >
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>
      </div>
    </div>
  );
}
