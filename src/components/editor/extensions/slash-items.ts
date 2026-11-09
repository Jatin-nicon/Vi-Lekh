import type { Editor, Range } from "@tiptap/core";

export interface SlashItem {
  title: string;
  description: string;
  icon: string;
  category: string;
  aliases?: string[];
  command: (args: { editor: Editor; range: Range }) => void;
}

export const getSlashCommands = (): SlashItem[] => [
  {
    title: "Heading 1",
    description: "Main section heading",
    icon: "H1",
    category: "Typography",
    aliases: ["h1", "heading", "heading1", "header", "header1", "title"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Subsection heading",
    icon: "H2",
    category: "Typography",
    aliases: ["h2", "heading", "heading2", "header", "header2", "subtitle"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Topic heading",
    icon: "H3",
    category: "Typography",
    aliases: ["h3", "heading", "heading3", "header", "header3", "subheading"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create an unorganized bullet list",
    icon: "•",
    category: "Lists",
    aliases: ["bullet", "list", "ul", "unordered"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a sequential ordered list",
    icon: "1.",
    category: "Lists",
    aliases: ["numbered", "ordered", "ol", "number"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Insert a quote or key theorem",
    icon: "“",
    category: "Blocks",
    aliases: ["quote", "blockquote", "cite"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: "Tip Callout",
    description: "Highlight an insight or key principle",
    icon: "💡",
    category: "Callouts",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { type: "tip" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Pro tip: write your insight here..." }] }],
        })
        .run();
    },
  },
  {
    title: "Warning Callout",
    description: "Highlight an edge-case or caution",
    icon: "⚠️",
    category: "Callouts",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { type: "warning" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Caution: important constraint goes here..." }] }],
        })
        .run();
    },
  },
  {
    title: "Note Callout",
    description: "Add background context or explanation",
    icon: "ℹ️",
    category: "Callouts",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "callout",
          attrs: { type: "info" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Note: supplementary background detail..." }] }],
        })
        .run();
    },
  },
  {
    title: "Code Block",
    description: "Notion-style code snippet with language selection",
    icon: "</>",
    category: "Technical",
    aliases: ["code", "codeblock", "snippet", "python", "js", "ts", "terminal"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: "Math Formula",
    description: "LaTeX mathematical equation",
    icon: "∑",
    category: "Technical",
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "paragraph",
          content: [{ type: "text", text: "$$ L(\\theta) = - \\sum_{i=1}^N \\log P(y_i | x_i; \\theta) $$" }],
        })
        .run();
    },
  },
  {
    title: "Image",
    description: "Upload or insert an image",
    icon: "🖼️",
    category: "Media",
    aliases: ["image", "img", "photo", "picture", "figure", "upload"],
    command: ({ editor, range }) => {
      const input = document.getElementById("tiptap-image-upload-input") as HTMLInputElement | null;
      if (input) {
        editor.chain().focus().deleteRange(range).run();
        input.click();
      } else {
        const url = window.prompt("Enter image URL:");
        if (url) {
          editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
        }
      }
    },
  },
  {
    title: "Divider",
    description: "Visual separation line",
    icon: "—",
    category: "Blocks",
    aliases: ["hr", "rule", "divider", "line"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

