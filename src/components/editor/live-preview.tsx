"use client";

import React, { useMemo } from "react";
import { renderMathInHtml } from "@/lib/editor/math-html";
import { HtmlSandboxedViewer } from "@/components/editor/html-sandboxed-viewer";
import { CheckCircle2 } from "lucide-react";

interface LivePreviewProps {
  html: string;
  noteTitle: string;
  className?: string;
}

export function LivePreview({ html, className = "" }: LivePreviewProps) {
  const renderedHtml = useMemo(() => {
    return renderMathInHtml(html);
  }, [html]);

  const isEmpty = !html || !html.trim();

  return (
    <div
      className={`relative flex flex-col h-[580px] xl:h-[650px] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] shadow-sm overflow-hidden transition-colors ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/60 dark:bg-[#181716]/60 px-5 py-2.5 select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#5D7063] animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#757069] dark:text-[#948F86]">
            Reader Simulation Preview (Isolated)
          </h2>
        </div>
        <span className="text-[11px] font-mono text-[#757069] dark:text-[#948F86]">Live sync</span>
      </div>

      {/* Scrollable Preview Canvas */}
      <div className="flex-1 min-h-0 overflow-y-auto sidebar-scrollbar p-4 sm:p-8 leading-relaxed text-[#2D2926] dark:text-[#E3DFD7]">
        {isEmpty ? (
          <div className="py-20 text-center text-xs text-[#757069] dark:text-[#948F86] italic">
            Start typing in the HTML editor to see live reader preview here...
          </div>
        ) : (
          <div className="w-full">
            <HtmlSandboxedViewer html={renderedHtml} />
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center justify-between border-t border-[#E8E3D9]/60 dark:border-[#33312E] bg-[#F5F2EB]/50 dark:bg-[#181716]/50 px-5 py-2 text-[11px] text-[#757069] dark:text-[#948F86] shrink-0">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#5D7063]" />
          Verified formatting
        </span>
        <span>Rendered in Real Time</span>
      </div>
    </div>
  );
}
