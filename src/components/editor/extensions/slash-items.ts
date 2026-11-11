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
  {
    title: "Process Flow",
    description: "Horizontal step timeline with connector arrows",
    icon: "➔",
    category: "Workbook",
    aliases: ["flow", "steps", "timeline", "process", "pipeline"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "processFlow",
          attrs: {
            title: "★ Each generation hides a layer of hard work",
            steps: [
              { id: "1", icon: "🔌", title: "Switches & cards", description: "talk to the machine in its own code" },
              { id: "2", icon: "⌨️", title: "Programming languages", description: "write rules in near-English" },
              { id: "3", icon: "📦", title: "Ready-made blocks", description: "reuse what others wrote" },
              { id: "4", icon: "💬", title: "Plain-language requests", description: "describe it; AI writes the code", highlighted: true },
            ],
          },
        })
        .run();
    },
  },
  {
    title: "Your Note",
    description: "Student workbook reflection box with ruled lines",
    icon: "✎",
    category: "Workbook",
    aliases: ["your-note", "yournote", "note-box", "reflection", "exercise"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "yourNote",
          attrs: {
            prompt: "One task in your life that went from many steps to one tap...",
            lines: 3,
          },
        })
        .run();
    },
  },
  {
    title: "Concept Cards Grid",
    description: "2-column grid for terms, pitfalls, and fixes",
    icon: "⊞",
    category: "Workbook",
    aliases: ["cards", "grid", "antipattern", "terms", "concepts"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "cardGrid",
          attrs: {
            cards: [
              {
                id: "c1",
                icon: "🤷",
                title: "Too vague",
                accent: "pitfall",
                content: '"Make it nice." Nice to whom?',
                fix: "Fix: name one thing you can see or test.",
                inOtherWords: "Leave no room for guessing.",
              },
              {
                id: "c2",
                icon: "🧳",
                title: "Too much at once",
                accent: "pitfall",
                content: "Ten features in one message; three get done well.",
                fix: "Fix: one feature per round.",
                inOtherWords: "Work in small verifiable steps.",
              },
            ],
          },
        })
        .run();
    },
  },
  {
    title: "Prompt Round",
    description: "Evolution block showing You Ask vs You Get & Notice",
    icon: "💬",
    category: "Workbook",
    aliases: ["round", "prompt-round", "dialogue", "turn", "iteration"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "promptRound",
          attrs: {
            round: 1,
            ask: '"Make me an expense app."',
            notice: "A neat list for one person's spending. Nothing about sharing. You never said there were four of you.",
          },
        })
        .run();
    },
  },
  {
    title: "Pinned Takeaway",
    description: "Warm amber sticky note for core principles",
    icon: "📌",
    category: "Workbook",
    aliases: ["pinned", "pin", "takeaway", "mantra", "quote"],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: "pinnedNote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "The AI writes the code. You write the wish. Getting good at this is not about magic words. It is about knowing what you want, saying it plainly, and checking what came back.",
                },
              ],
            },
          ],
        })
        .run();
    },
  },
];

