"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Image as ImageIcon, Loader2 } from "lucide-react";

import { uploadImage } from "@/lib/services/image-upload";
import { Callout } from "./extensions/callout";
import { NotionCodeBlockExtension } from "./extensions/notion-code-block";
import { SlashCommand } from "./extensions/slash-command";
import { EditorBubbleMenu } from "./bubble-menu";

interface RichEditorProps {
  initialHtml?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}

export function RichEditor({
  initialHtml = "",
  onChange,
  placeholder = "Write lecture notes... Type '/' on an empty line for block options",
}: RichEditorProps) {
  const [, setContentVersion] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadImage(file);
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err: unknown) {
      console.error("Image upload failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to upload image. Please try again.";
      alert(msg);
    } finally {
      setUploadingImage(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false,
      }),
      NotionCodeBlockExtension,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") {
            const level = node.attrs.level || 1;
            return `Heading ${level}...`;
          }
          return placeholder;
        },
        emptyNodeClass: "is-empty",
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-[#A85D44] dark:text-[#C4785E] underline decoration-[#A85D44]/40 hover:text-[#8F4C35] transition-colors",
        },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class:
            "rounded-xl border border-[#E8E3D9] dark:border-[#33312E] my-6 shadow-md max-w-full mx-auto",
        },
      }),
      Callout,
      SlashCommand,
    ],
    content: initialHtml || "",
    editorProps: {
      attributes: {
        class:
          "prose max-w-none min-h-[420px] outline-none font-sans text-base leading-relaxed text-[#2D2926] dark:text-[#E3DFD7] focus:outline-none p-6 sm:p-8",
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file && file.type.startsWith("image/")) {
            event.preventDefault();
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      setContentVersion((v) => v + 1);
    },
  });

  const stats = useMemo(() => {
    if (!editor) return { words: 0, characters: 0 };
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return {
      words,
      characters: text.length,
    };
  }, [editor]);

  // Sync content when initialHtml changes externally
  useEffect(() => {
    if (!editor) return;
    if (initialHtml && editor.getHTML() !== initialHtml && editor.getText().length === 0) {
      editor.commands.setContent(initialHtml);
    }
  }, [initialHtml, editor]);

  return (
    <div className="relative flex flex-col min-h-[550px] sm:min-h-[650px] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] shadow-sm overflow-hidden transition-colors">
      {/* Top Quick-Access Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/60 dark:bg-[#181716]/60 px-4 py-2.5 select-none shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="rounded-lg p-1.5 text-xs text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="rounded-lg p-1.5 text-xs text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            ↪
          </button>

          <div className="h-4 w-px bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Heading buttons */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
              editor?.isActive("heading", { level: 1 })
                ? "bg-[#A85D44] text-white"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
              editor?.isActive("heading", { level: 2 })
                ? "bg-[#A85D44] text-white"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
              editor?.isActive("heading", { level: 3 })
                ? "bg-[#A85D44] text-white"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
          >
            H3
          </button>

          <div className="h-4 w-px bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Basic marks */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
              editor?.isActive("bold")
                ? "bg-[#A85D44] text-white"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`rounded-lg px-2.5 py-1 text-xs italic font-serif transition-colors ${
              editor?.isActive("italic")
                ? "bg-[#A85D44] text-white"
                : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
            }`}
          >
            I
          </button>

          <div className="h-4 w-px bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Quick Insert Callout */}
          <button
            type="button"
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .insertContent({
                  type: "callout",
                  attrs: { type: "tip" },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Pro tip: ..." }] }],
                })
                .run()
            }
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-[#A85D44] dark:text-[#C4785E] bg-[#A85D44]/10 hover:bg-[#A85D44]/20 border border-[#A85D44]/20 transition-colors"
          >
            <span>💡</span>
            <span>Callout</span>
          </button>

          <div className="h-4 w-px bg-[#E8E3D9] dark:border-[#33312E] mx-1" />

          {/* Quick Insert Image */}
          <button
            type="button"
            onClick={() => document.getElementById("tiptap-image-upload-input")?.click()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] border border-[#E8E3D9] dark:border-[#33312E] transition-colors"
            title="Upload or Insert Image"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
            <span>Image</span>
          </button>
        </div>

        {/* Word count & Reading Time statistics */}
        <div className="flex items-center gap-2.5 text-[11px] text-[#757069] dark:text-[#948F86] font-mono">
          <span>{stats.words} words</span>
          <span>•</span>
          <span>{Math.max(1, Math.ceil(stats.words / 200))} min read</span>
        </div>
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        id="tiptap-image-upload-input"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImageUpload(file);
            e.target.value = "";
          }
        }}
      />

      {/* Uploading Status Pill */}
      {uploadingImage && (
        <div className="absolute top-14 right-4 z-30 flex items-center gap-2 rounded-xl border border-[#A85D44]/30 bg-[#FAF8F5]/95 dark:bg-[#21201E]/95 px-3 py-1.5 shadow-lg backdrop-blur text-xs text-[#A85D44] dark:text-[#C4785E] font-medium animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Uploading image...</span>
        </div>
      )}

      {/* Bubble Menu on text selection */}
      {editor && <EditorBubbleMenu editor={editor} />}

      {/* Editor Content Canvas */}
      <div className="relative flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-[#E8E3D9]/60 dark:border-[#33312E] bg-[#F5F2EB]/50 dark:bg-[#181716]/50 px-4 py-2 text-[11px] text-[#757069] dark:text-[#948F86] shrink-0">
        <span>
          Tip: Type <kbd className="rounded border border-[#E8E3D9] dark:border-[#33312E] bg-[#EFEBE3] dark:bg-[#292825] px-1 py-0.5 text-xs text-[#2D2926] dark:text-[#E3DFD7]">/</kbd> on an empty line for block options
        </span>
        <span>Highlight text for inline styling</span>
      </div>
    </div>
  );
}

