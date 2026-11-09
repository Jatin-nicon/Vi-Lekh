"use client";

import React, { useState } from "react";
import CodeBlock from "@tiptap/extension-code-block";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
  NodeViewProps,
} from "@tiptap/react";
import { Copy, Check, Terminal, ChevronDown } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/syntax/highlighter";

function NotionCodeBlockEditorComponent({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const currentLang = (node.attrs.language as string) || "python";

  const handleCopy = async () => {
    try {
      const text = node.textContent;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <NodeViewWrapper className="notion-code-block-editor group my-6 overflow-hidden rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1E1C1B] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors">
      {/* Header bar */}
      <div
        contentEditable={false}
        className="flex items-center justify-between px-3 py-1.5 border-b border-[#E8E3D9]/70 dark:border-[#33312E]/70 bg-[#F5F2EB]/70 dark:bg-[#181716]/70 select-none text-xs"
      >
        {/* Language selector dropdown */}
        <div className="relative flex items-center gap-1.5 font-mono text-[11px] text-[#757069] dark:text-[#948F86]">
          <Terminal className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E] shrink-0" />
          <div className="relative flex items-center">
            <select
              value={currentLang}
              onChange={(e) => updateAttributes({ language: e.target.value })}
              className="appearance-none bg-transparent hover:bg-[#EBE6DC]/60 dark:hover:bg-[#2B2A27]/60 pr-5 pl-1.5 py-0.5 rounded cursor-pointer font-medium text-[#2D2926] dark:text-[#E3DFD7] outline-none transition-colors border-none"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option
                  key={lang.id}
                  value={lang.id}
                  className="bg-[#FAF8F5] dark:bg-[#21201E] text-[#2D2926] dark:text-[#E3DFD7]"
                >
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#757069] dark:text-[#948F86] pointer-events-none absolute right-1" />
          </div>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-all ${
            copied
              ? "bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] font-medium"
              : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] hover:text-[#2D2926] dark:hover:text-[#E3DFD7]"
          }`}
          title="Copy snippet"
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

      {/* Code Editor Content */}
      <pre className="font-mono text-[13px] sm:text-[13.5px] leading-[1.65] py-3.5 px-4 overflow-x-auto text-[#2D2926] dark:text-[#E3DFD7] m-0 bg-transparent">
        <NodeViewContent<'code'> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

export const NotionCodeBlockExtension = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(NotionCodeBlockEditorComponent);
  },
});
