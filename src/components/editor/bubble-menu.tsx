"use client";

import React, { useState } from "react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import { Link2, Unlink } from "lucide-react";

interface EditorBubbleMenuProps {
  editor: Editor | null;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setShowLinkInput(false);
      return;
    }

    const formattedUrl =
      linkUrl.startsWith("http://") || linkUrl.startsWith("https://")
        ? linkUrl
        : `https://${linkUrl}`;

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: formattedUrl, target: "_blank" })
      .run();
    setShowLinkInput(false);
    setLinkUrl("");
  };

  return (
    <TiptapBubbleMenu
      editor={editor}
      className="flex items-center gap-1 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/95 dark:bg-[#21201E]/95 p-1.5 shadow-xl backdrop-blur-xl"
    >
      {!showLinkInput ? (
        <>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              editor.isActive("bold")
                ? "bg-[#A85D44]/20 text-[#A85D44] dark:text-[#C4785E] border border-[#A85D44]/40"
                : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
            title="Bold (Ctrl+B)"
          >
            B
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`rounded-xl px-2.5 py-1 text-xs italic font-serif transition-all ${
              editor.isActive("italic")
                ? "bg-[#A85D44]/20 text-[#A85D44] dark:text-[#C4785E] border border-[#A85D44]/40"
                : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
            title="Italic (Ctrl+I)"
          >
            I
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`rounded-xl px-2.5 py-1 text-xs line-through transition-all ${
              editor.isActive("strike")
                ? "bg-[#A85D44]/20 text-[#A85D44] dark:text-[#C4785E] border border-[#A85D44]/40"
                : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
            title="Strikethrough"
          >
            S
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`rounded-xl px-2 py-1 font-mono text-xs transition-all ${
              editor.isActive("code")
                ? "bg-[#A85D44]/20 text-[#A85D44] dark:text-[#C4785E] border border-[#A85D44]/40"
                : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
            title="Inline Code"
          >
            {"</>"}
          </button>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`rounded-xl px-2 py-1 text-xs font-medium transition-all ${
              editor.isActive("highlight")
                ? "bg-amber-400/30 text-amber-800 dark:text-amber-200 border border-amber-400/50"
                : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
            title="Highlight"
          >
            🖊️
          </button>

          <div className="h-4 w-px bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Link button */}
          <button
            type="button"
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setLinkUrl(editor.getAttributes("link").href || "");
                setShowLinkInput(true);
              }
            }}
            className={`flex items-center gap-1 rounded-xl px-2 py-1 text-xs transition-all ${
              editor.isActive("link")
                ? "bg-[#A85D44]/20 text-[#A85D44] dark:text-[#C4785E] border border-[#A85D44]/40"
                : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
            title={editor.isActive("link") ? "Remove link" : "Add link"}
          >
            {editor.isActive("link") ? <Unlink className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          </button>
        </>
      ) : (
        /* Inline Link URL Editor */
        <div className="flex items-center gap-1.5 p-0.5 animate-in fade-in">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetLink();
              } else if (e.key === "Escape") {
                setShowLinkInput(false);
              }
            }}
            placeholder="Paste URL & hit Enter..."
            autoFocus
            className="w-48 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] px-2.5 py-1 text-xs text-[#2D2926] dark:text-[#E3DFD7] focus:outline-none focus:ring-1 focus:ring-[#A85D44]"
          />
          <button
            type="button"
            onClick={handleSetLink}
            className="rounded-lg bg-[#A85D44] px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#8F4C35]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="rounded-lg px-2 py-1 text-xs text-[#757069] transition-colors hover:bg-[#EFEBE3]"
          >
            Cancel
          </button>
        </div>
      )}
    </TiptapBubbleMenu>
  );
}

