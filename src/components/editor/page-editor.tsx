"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronUp, FlaskConical, ImagePlus, ListChecks, Loader2, MessageSquarePlus, MousePointerClick, Pilcrow, Redo2, Undo2, User, X } from "lucide-react";
import { HtmlSandboxedViewer, type PageEditing } from "@/components/editor/html-sandboxed-viewer";
import { renderMathInHtml } from "@/lib/editor/math-html";
import { insertAfter, locate, locateEdited, parseSource, removeElement, renderedPath, renderedText, replaceInner, setStartTagStyle, type SourceTree } from "@/lib/editor/source-map";
import { FormatBar } from "@/components/editor/format-bar";
import { insertionAnchor } from "@/lib/editor/page-editing";
import { blockAnchor } from "@/lib/editor/comment-anchor";
import type { CommentAnchor } from "@/lib/data/comments";
import { contributionSnippet, imageSnippet, type ContributionKind, type Contributor } from "@/lib/editor/contribution-snippets";
import { uploadImage } from "@/lib/services/image-upload";

const HISTORY_LIMIT = 100;

/** What "Add after this" inserts, and which part of it opens for editing (a child-index path inside the new element). */
const INSERTS: { key: string; label: string; icon: React.ReactNode; focus: number[]; build: (c: Contributor | null) => string }[] = [
  { key: "case-study", label: "Case Study", icon: <BookOpen className="w-3.5 h-3.5" />, focus: [1], build: (c) => contributionSnippet("case-study" as ContributionKind, c) },
  { key: "experience", label: "My Experience", icon: <User className="w-3.5 h-3.5" />, focus: [1], build: (c) => contributionSnippet("experience", c) },
  { key: "findings", label: "Findings", icon: <FlaskConical className="w-3.5 h-3.5" />, focus: [1, 0], build: (c) => contributionSnippet("findings", c) },
  { key: "paragraph", label: "Paragraph", icon: <Pilcrow className="w-3.5 h-3.5" />, focus: [], build: () => "<p>New paragraph</p>\n" },
];

/** A rendered element found again in the source by its path, tag and text (design D2). */
interface Target {
  path: number[];
  tag: string;
  text: string;
}

interface Selected {
  /** Where new sections go: after the block, or after its whole list or table. */
  anchorPath: number[];
  anchorTag: string;
  anchorText: string;
  /** The block itself, for removing it (design D10). */
  block: Target;
  /** The added section or figure around the block, which can be removed as a whole. */
  container: (Target & { label: "section" | "image" }) | null;
  /** Where the toolbar's bottom edge goes inside the editor (just above the block), in CSS pixels. */
  top: number;
}

const targetOf = (el: Element, root: Element): Target | null => {
  const path = renderedPath(el, root);
  return path ? { path, tag: el.tagName, text: renderedText(el) } : null;
};

/**
 * Suggest mode's Page view (design D3–D5): the draft rendered like the
 * reader, edited by clicking text. Edits and insertions are spliced into the
 * draft HTML; everything else stays as it was.
 */
export function PageEditor({
  html,
  onChange,
  contributor,
  onUneditable,
}: {
  html: string;
  onChange: (html: string) => void;
  contributor: Contributor | null;
  /** "Leave a comment" on text that can't be edited on the page; without it, only a message shows. */
  onUneditable?: (anchor: CommentAnchor) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const latest = useRef(html);
  const tree = useRef<SourceTree | null>(null);
  const focusNext = useRef<number[] | null>(null);
  const history = useRef<{ stack: string[]; index: number }>({ stack: [html], index: 0 });
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [selected, setSelected] = useState<Selected | null>(null);
  /** The block being edited, for the formatting bar, and a way to drop its edit before removing it. */
  const [session, setSession] = useState<{ element: HTMLElement; cancel: () => void } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The part that couldn't be edited, offered for a comment instead. */
  const [uneditable, setUneditable] = useState<CommentAnchor | null>(null);
  const say = (text: string) => {
    setNotice(text);
    setUneditable(null);
  };
  const [imageBusy, setImageBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  // The draft can change from outside (opening, undo); keep the latest copy for splicing.
  useEffect(() => {
    latest.current = html;
  }, [html]);

  const sourceTree = useCallback(() => {
    if (!tree.current || tree.current.html !== latest.current) tree.current = parseSource(latest.current);
    return tree.current;
  }, []);

  const syncHistory = () => {
    const h = history.current;
    setHistoryState({ canUndo: h.index > 0, canRedo: h.index < h.stack.length - 1 });
  };

  const apply = useCallback(
    (next: string) => {
      if (next === latest.current) return;
      const h = history.current;
      h.stack = h.stack.slice(0, h.index + 1);
      h.stack.push(next);
      if (h.stack.length > HISTORY_LIMIT + 1) h.stack.shift();
      h.index = h.stack.length - 1;
      latest.current = next;
      syncHistory();
      onChange(next);
    },
    [onChange],
  );

  const step = useCallback(
    (delta: -1 | 1) => {
      const h = history.current;
      const index = h.index + delta;
      if (index < 0 || index >= h.stack.length) return;
      h.index = index;
      latest.current = h.stack[index];
      setSelected(null);
      syncHistory();
      onChange(h.stack[index]);
    },
    [onChange],
  );

  // Ctrl+Z / Ctrl+Y outside a block being edited (inside one, the browser undoes typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        step(-1);
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        step(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const editing = useMemo<PageEditing>(
    () => ({
      canEdit: (el, root) => locate(sourceTree(), el, root).ok,
      onCommit: (el, root, change, original) => {
        const path = renderedPath(el, root);
        const probe = document.createElement("div");
        probe.innerHTML = original;
        const found = path && locateEdited(sourceTree(), path, el.tagName, probe.textContent ?? "");
        if (!found || !found.ok) {
          say("That change couldn't be saved because the page changed underneath it. Please make it again.");
          return;
        }
        let next = latest.current;
        if (change.inner !== null) next = replaceInner(next, found.element, change.inner);
        // The inner change comes after the start tag, so its offsets still hold (design D11).
        if (change.align !== undefined) next = setStartTagStyle(next, found.element, "text-align", change.align || null);
        apply(next);
      },
      onSession: (s) => setSession(s ? { element: s.element, cancel: s.cancel } : null),
      onSelect: (sel) => {
        if (!sel) return setSelected(null);
        const anchor = insertionAnchor(sel.element, sel.root);
        const anchorPath = renderedPath(anchor, sel.root);
        const wrap = wrapRef.current;
        if (!anchorPath || !wrap) return setSelected(null);
        const rect = sel.element.getBoundingClientRect();
        const block = targetOf(sel.element, sel.root);
        if (!block) return setSelected(null);
        const section = sel.element.closest(".vl-contribution");
        const figure = sel.element.closest("figure");
        const around = section && sel.root.contains(section) ? section : figure && sel.root.contains(figure) ? figure : null;
        const aroundTarget = around ? targetOf(around, sel.root) : null;
        setNotice(null);
        setUneditable(null);
        setSelected({
          anchorPath,
          anchorTag: anchor.tagName,
          anchorText: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
          block,
          container: aroundTarget ? { ...aroundTarget, label: around === section ? "section" : "image" } : null,
          top: rect.top - wrap.getBoundingClientRect().top - 6,
        });
      },
      onUneditable: ({ element, root, text }) => {
        setSelected(null);
        setNotice(
          onUneditable
            ? "This part can't be edited on the page. You can leave a comment about it for the course's reviewers instead."
            : "This part can't be edited on the page.",
        );
        setUneditable(text ? (blockAnchor(element, root) ?? { quote: text }) : null);
      },
      takeFocusPath: () => {
        const p = focusNext.current;
        focusNext.current = null;
        return p;
      },
    }),
    [apply, sourceTree, onUneditable],
  );

  /** Inserts markup after the selected block and opens part of it for editing. */
  const insert = (markup: string, focus: number[] | null) => {
    if (!selected) return;
    const found = locateEdited(sourceTree(), selected.anchorPath, selected.anchorTag, selected.anchorText);
    if (!found.ok) {
      say("Couldn't add it there. Click the text again and retry.");
      return;
    }
    const at = selected.anchorPath;
    const newPath = [...at.slice(0, -1), at[at.length - 1] + 1];
    focusNext.current = focus ? [...newPath, ...focus] : null;
    setSelected(null);
    apply(insertAfter(latest.current, found.element, markup));
  };

  /** Removes the selected block, or the section or figure around it (design D10). */
  const remove = (target: Target) => {
    // Drop any typing in the block first, so it isn't saved after the block is gone.
    session?.cancel();
    const found = locateEdited(sourceTree(), target.path, target.tag, target.text);
    if (!found.ok) {
      say("Couldn't remove that part. Click it again and retry.");
      return;
    }
    setSelected(null);
    apply(removeElement(latest.current, found.element));
  };

  const onImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      say(`“${file.name}” is not an image. Choose a JPEG, PNG, WebP, GIF or SVG file.`);
      return;
    }
    setImageBusy(true);
    try {
      const src = await uploadImage(file);
      insert(imageSnippet(src, file.name), [1]);
    } catch (err) {
      say(err instanceof Error ? err.message : "The image could not be added.");
    } finally {
      setImageBusy(false);
    }
  };

  const rendered = useMemo(() => renderMathInHtml(html), [html]);
  const removeBtn =
    "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#181716] text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer";
  const btn =
    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-40 disabled:hover:border-[#E8E3D9] disabled:hover:text-inherit cursor-pointer disabled:cursor-default";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs text-[#757069] dark:text-[#948F86]">
          <MousePointerClick className="w-3.5 h-3.5" /> Click any text to edit or format it. Click elsewhere to keep the change.
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => step(-1)} disabled={!historyState.canUndo} title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
          <button type="button" className={btn} onClick={() => step(1)} disabled={!historyState.canRedo} title="Redo (Ctrl+Y)">
            <Redo2 className="w-3.5 h-3.5" /> Redo
          </button>
        </div>
      </div>

      <FormatBar element={session?.element ?? null} />

      {notice && (
        <div role="status" className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
          <span className="flex-1">{notice}</span>
          {onUneditable && uneditable && (
            <button
              type="button"
              onClick={() => {
                onUneditable(uneditable);
                setNotice(null);
                setUneditable(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800 font-semibold cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" /> Leave a comment
            </button>
          )}
          <button type="button" onClick={() => { setNotice(null); setUneditable(null); }} aria-label="Dismiss" className="cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div ref={wrapRef} className="relative rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#EFEBE3] dark:bg-[#161514] p-2 sm:p-6">
        {selected && (
          <div
            role="toolbar"
            aria-label="Add after this"
            onPointerDown={(e) => e.preventDefault()}
            style={{ top: selected.top }}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-full z-20 flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#BFD3F2] dark:border-[#2C3E5C] shadow-lg text-xs max-w-[95%]"
          >
            <span className="px-1.5 font-semibold text-[#2563EB] flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" /> Add after this:
            </span>
            {INSERTS.map((it) => (
              <button key={it.key} type="button" className={btn} onClick={() => insert(it.build(contributor), it.focus)}>
                {it.icon} {it.label}
              </button>
            ))}
            <button type="button" className={btn} disabled={imageBusy} onClick={() => imageInput.current?.click()}>
              {imageBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} Image
            </button>
            <span className="w-px h-5 bg-[#E8E3D9] dark:bg-[#33312E]" aria-hidden />
            <button type="button" className={removeBtn} onClick={() => remove(selected.block)} title="Remove this part from your draft">
              <X className="w-3.5 h-3.5" /> Remove
            </button>
            {selected.container && (
              <button type="button" className={removeBtn} onClick={() => remove(selected.container!)} title={`Remove the whole ${selected.container.label}`}>
                <X className="w-3.5 h-3.5" /> Remove {selected.container.label}
              </button>
            )}
            <button type="button" onClick={() => setSelected(null)} aria-label="Hide this bar" title="Hide this bar" className="p-1 text-[#757069] cursor-pointer">
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <input
          ref={imageInput}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Choose an image to add"
          onChange={(e) => {
            void onImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <HtmlSandboxedViewer html={rendered} paged editing={editing} />
      </div>
    </div>
  );
}
