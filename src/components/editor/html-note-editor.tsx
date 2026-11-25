"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table,
  Code2,
  Quote,
  Pin,
  PenTool,
  Sparkles,
  GitCommit,
  LayoutGrid,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  BookOpen,
  UserRound,
  FlaskConical,
} from "lucide-react";
import { findUnbundledFonts } from "@/lib/layout/font-check";
import { contributionSnippet, type Contributor } from "@/lib/editor/contribution-snippets";

interface HtmlNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Signed-in user, recorded on inserted contribution sections. */
  contributor?: Contributor | null;
}

interface Snippet {
  label: string;
  icon?: React.ReactNode;
  /** Static template, or `build` for snippets generated per insertion. */
  template?: string;
  build?: () => string;
  title: string;
}

export function HtmlNoteEditor({
  value,
  onChange,
  placeholder = "Write lecture notes in HTML...",
  className = "",
  contributor = null,
}: HtmlNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Synchronize gutter scroll with textarea
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lines = useMemo(() => {
    return value.split("\n");
  }, [value]);

  const stats = useMemo(() => {
    const textWithoutTags = value.replace(/<[^>]*>/g, " ").trim();
    const words = textWithoutTags ? textWithoutTags.split(/\s+/).length : 0;
    return {
      lines: lines.length,
      words,
      chars: value.length,
    };
  }, [value, lines.length]);

  // Fonts that are not bundled lay out differently per device (design D2).
  const unbundledFonts = useMemo(() => findUnbundledFonts(value), [value]);

  // Handle Tab key (2 spaces) and Enter key (auto-indent)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + "  " + val.substring(end);
      onChange(updated);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
      return;
    }

    if (e.key === "Enter") {
      const start = textarea.selectionStart;
      const val = textarea.value;
      const currentLine = val.substring(0, start).split("\n").pop() || "";
      const match = currentLine.match(/^(\s+)/);

      if (match && match[1]) {
        e.preventDefault();
        const indent = match[1];
        const updated = val.substring(0, start) + "\n" + indent + val.substring(start);
        onChange(updated);

        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        });
      }
    }
  };

  // Helper to insert snippet at current cursor or wrap selection
  const insertSnippet = useCallback(
    (snippet: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        onChange(value + (value ? "\n\n" : "") + snippet);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const val = textarea.value;

      let insertion = snippet;
      // If wrapping selection
      if (selectedText && snippet.includes("$SELECTION")) {
        insertion = snippet.replace("$SELECTION", selectedText);
      } else if (snippet.includes("$SELECTION")) {
        insertion = snippet.replace("$SELECTION", "Content goes here...");
      }

      const updated = val.substring(0, start) + insertion + val.substring(end);
      onChange(updated);

      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + insertion.length;
        textarea.selectionStart = textarea.selectionEnd = newPos;
      });
    },
    [value, onChange]
  );

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preset quick snippets
  const snippets: { group: string; items: Snippet[] }[] = [
    {
      group: "Typography",
      items: [
        {
          label: "H1",
          title: "Section Heading 1",
          icon: <Heading1 className="w-3.5 h-3.5" />,
          template: "<h1>$SELECTION</h1>\n",
        },
        {
          label: "H2",
          title: "Subsection Heading 2",
          icon: <Heading2 className="w-3.5 h-3.5" />,
          template: "<h2>$SELECTION</h2>\n",
        },
        {
          label: "H3",
          title: "Topic Heading 3",
          icon: <Heading3 className="w-3.5 h-3.5" />,
          template: "<h3>$SELECTION</h3>\n",
        },
        {
          label: "P",
          title: "Paragraph",
          template: "<p>$SELECTION</p>\n",
        },
      ],
    },
    {
      group: "Blocks",
      items: [
        {
          label: "List",
          title: "Bullet List",
          icon: <List className="w-3.5 h-3.5" />,
          template: "<ul>\n  <li>First item</li>\n  <li>Second item</li>\n</ul>\n",
        },
        {
          label: "Ordered",
          title: "Numbered List",
          icon: <ListOrdered className="w-3.5 h-3.5" />,
          template: "<ol>\n  <li>Step one</li>\n  <li>Step two</li>\n</ol>\n",
        },
        {
          label: "Table",
          title: "Data Table",
          icon: <Table className="w-3.5 h-3.5" />,
          template:
            '<table class="w-full border-collapse my-4">\n  <thead>\n    <tr class="border-b">\n      <th class="text-left p-2">Concept</th>\n      <th class="text-left p-2">Explanation</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr class="border-b">\n      <td class="p-2 font-medium">Idea A</td>\n      <td class="p-2">Description</td>\n    </tr>\n  </tbody>\n</table>\n',
        },
        {
          label: "Code",
          title: "Code Block",
          icon: <Code2 className="w-3.5 h-3.5" />,
          template: '<pre><code class="language-python">\n# Python code snippet\ndef calculate_loss(y_true, y_pred):\n    return -np.sum(y_true * np.log(y_pred))\n</code></pre>\n',
        },
        {
          label: "Math",
          title: "KaTeX Math Equation",
          template: '<div class="math-block">\n  $$ L(\\theta) = - \\sum_{i=1}^N \\log P(y_i | x_i; \\theta) $$\n</div>\n',
        },
      ],
    },
    {
      group: "Workbook",
      items: [
        {
          label: "Tip Callout",
          title: "Tip Callout",
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
          template:
            '<div class="callout callout-tip">\n  <span class="callout-icon">💡</span>\n  <div class="callout-body">Key insight: state your takeaway plainly here.</div>\n</div>\n',
        },
        {
          label: "Warning Callout",
          title: "Warning Callout",
          template:
            '<div class="callout callout-warning">\n  <span class="callout-icon">⚠️</span>\n  <div class="callout-body">Pitfall: common edge-case or mistake to avoid.</div>\n</div>\n',
        },
        {
          label: "Cards",
          title: "Concept Cards Grid",
          icon: <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />,
          template:
            '<div class="card-grid">\n  <div class="concept-card card-pitfall">\n    <span class="card-icon">🤷</span>\n    <h4>Too Vague</h4>\n    <p>"Make it nice." Nice to whom?</p>\n    <div class="card-fix">Fix: Name one observable test.</div>\n  </div>\n  <div class="concept-card card-solution">\n    <span class="card-icon">🎯</span>\n    <h4>Clear Constraint</h4>\n    <p>Specify explicit inputs, constraints, and success state.</p>\n    <div class="card-fix">Fix: Leave no room for guessing.</div>\n  </div>\n</div>\n',
        },
        {
          label: "Process Flow",
          title: "Timeline Process Flow",
          icon: <GitCommit className="w-3.5 h-3.5 text-indigo-500" />,
          template:
            '<div class="process-flow">\n  <h4>Evolution Timeline</h4>\n  <div class="flow-steps">\n    <div class="flow-step">\n      <span class="flow-icon">1</span>\n      <strong>Initial Idea</strong>\n      <p>Drafting core problem definition</p>\n    </div>\n    <div class="flow-step highlighted">\n      <span class="flow-icon">2</span>\n      <strong>Implementation</strong>\n      <p>Building working system</p>\n    </div>\n  </div>\n</div>\n',
        },
        {
          label: "Your Note",
          title: "Worksheet Reflection Box",
          icon: <PenTool className="w-3.5 h-3.5 text-[#5D7063]" />,
          template:
            '<div class="your-note">\n  <div class="note-header">✎ YOUR NOTE</div>\n  <p class="note-prompt">What is one concept from this lecture that surprised you?</p>\n  <div class="rule-lines">\n    <div class="rule-line"></div>\n    <div class="rule-line"></div>\n    <div class="rule-line"></div>\n  </div>\n</div>\n',
        },
        {
          label: "Takeaway",
          title: "Pinned Takeaway Mantra",
          icon: <Pin className="w-3.5 h-3.5 text-amber-600" />,
          template:
            '<div class="pinned-note">\n  <div class="pinned-header">📌 CORE TAKEAWAY / MANTRA</div>\n  <div class="pinned-content">The AI writes the code. You write the wish. Say it plainly, check what came back.</div>\n</div>\n',
        },
      ],
    },
    {
      group: "Contribute",
      items: [
        {
          label: "Case Study",
          title: "Case Study: context, what happened, findings",
          icon: <BookOpen className="w-3.5 h-3.5 text-[#5D7063]" />,
          build: () => contributionSnippet("case-study", contributor),
        },
        {
          label: "My Experience",
          title: "Your own experience with this topic",
          icon: <UserRound className="w-3.5 h-3.5 text-[#A85D44]" />,
          build: () => contributionSnippet("experience", contributor),
        },
        {
          label: "Findings",
          title: "A list of findings",
          icon: <FlaskConical className="w-3.5 h-3.5 text-[#2B6CB0]" />,
          build: () => contributionSnippet("findings", contributor),
        },
      ],
    },
  ];

  return (
    <div
      className={`relative flex flex-col min-h-[550px] sm:min-h-[650px] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#1C1A19] shadow-sm overflow-clip transition-colors ${className}`}
    >
      {/* Top Snippet & Formatting Toolbar */}
      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#22201E]/95 backdrop-blur-xs px-3 py-2 select-none shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full">
          {snippets.map((group, gIdx) => (
            <div key={group.group} className="flex items-center gap-1">
              {gIdx > 0 && <span className="h-4 w-[1px] bg-[#E8E3D9] dark:bg-[#33312E] mx-1" />}
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => insertSnippet(item.build ? item.build() : item.template ?? "")}
                  title={item.title}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-[#757069] dark:text-[#948F86] hover:text-[#2D2926] dark:hover:text-[#E3DFD7] hover:bg-white dark:hover:bg-[#2E2B29] transition-all cursor-pointer shadow-2xs border border-transparent hover:border-[#E8E3D9] dark:hover:border-[#33312E]"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-medium text-[#757069] dark:text-[#948F86] hover:text-[#2D2926] dark:hover:text-[#E3DFD7] px-2 py-1 rounded transition-colors cursor-pointer"
            title="Copy entire document HTML"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {unbundledFonts.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 border-b border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-xs text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            {unbundledFonts.length === 1 ? "The font " : "The fonts "}
            {unbundledFonts.map((f, i) => (
              <React.Fragment key={f}>
                {i > 0 && ", "}
                <code className="font-mono font-semibold">{f}</code>
              </React.Fragment>
            ))}{" "}
            {unbundledFonts.length === 1 ? "isn’t" : "aren’t"} bundled, so line breaks can differ between
            devices and readers’ annotations may not line up. Remove the <code className="font-mono">font-family</code>{" "}
            to use the default note fonts.
          </span>
        </div>
      )}

      {/* Editor Body with Synchronized Line Gutter */}
      <div className="relative flex-1 flex min-h-[460px] bg-[#FAF8F5] dark:bg-[#181615] overflow-hidden">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-11 py-4 bg-[#F2EDE4] dark:bg-[#1C1A19] border-r border-[#E8E3D9] dark:border-[#2C2927] text-right pr-2.5 font-mono text-xs select-none text-[#A8A196] dark:text-[#635E57] overflow-hidden shrink-0 pointer-events-none"
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed h-[20px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea Code Canvas */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={false}
          className="flex-1 p-4 font-mono text-[13px] leading-relaxed text-[#2D2926] dark:text-[#E3DFD7] bg-transparent outline-none resize-none overflow-y-auto whitespace-pre tab-2 border-none"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Document Statistics Footer */}
      <div className="flex items-center justify-between border-t border-[#E8E3D9]/60 dark:border-[#33312E] bg-[#F5F2EB]/60 dark:bg-[#1C1A19] px-4 py-1.5 text-[11px] font-mono text-[#757069] dark:text-[#948F86] select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>{stats.lines} lines</span>
          <span>•</span>
          <span>{stats.words} words</span>
          <span>•</span>
          <span>{stats.chars} chars</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-sans font-medium text-[10px] uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Pure HTML Mode
        </div>
      </div>
    </div>
  );
}

