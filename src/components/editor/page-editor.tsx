"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, MessageSquarePlus, MousePointerClick, Redo2, Undo2, X } from "lucide-react";
import { HtmlSandboxedViewer, type PageEditing } from "@/components/editor/html-sandboxed-viewer";
import { renderMathInHtml } from "@/lib/editor/math-html";
import { insertAfter, insertAtEnd, locate, locateEdited, parseSource, removeElement, renameElement, renderedPath, renderedText, replaceInner, resolvePath, setStartTagStyle, sourceText, type SourceTree } from "@/lib/editor/source-map";
import { FormatBar, type BlockTag } from "@/components/editor/format-bar";
import { insertionAnchor } from "@/lib/editor/page-editing";
import { blockAnchor } from "@/lib/editor/comment-anchor";
import type { CommentAnchor } from "@/lib/data/comments";
import { imageSnippet } from "@/lib/editor/contribution-snippets";
import { uploadImage } from "@/lib/services/image-upload";

const HISTORY_LIMIT = 100;

/** What the top bar's Text box and block types insert (design D4, D12). */
const NEW_BLOCK: Record<BlockTag, string> = {
  p: "<p>New paragraph</p>",
  h1: "<h1>New heading</h1>",
  h2: "<h2>New heading</h2>",
  h3: "<h3>New heading</h3>",
};

/** A rendered element found again in the source by its path, tag and text (design D2). */
interface Target {
  path: number[];
  tag: string;
  text: string;
}

interface Selected {
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

const startsWith = (path: number[], prefix: number[]) => prefix.length <= path.length && prefix.every((v, i) => path[i] === v);

/**
 * Suggest mode's Page view (design D3–D5): the draft rendered like the
 * reader, edited by clicking text. Edits and insertions are spliced into the
 * draft HTML; everything else stays as it was.
 */
export function PageEditor({
  html,
  onChange,
  onUneditable,
}: {
  html: string;
  onChange: (html: string) => void;
  /** "Leave a comment" on text that can't be edited on the page; without it, only a message shows. */
  onUneditable?: (anchor: CommentAnchor) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const latest = useRef(html);
  const tree = useRef<SourceTree | null>(null);
  const focusNext = useRef<{ path: number[]; caret: "all" | "end" } | null>(null);
  /** Where the top bar inserts: after the part last clicked (or its whole list or table), kept after editing ends (design D4). */
  const anchor = useRef<Target | null>(null);
  const history = useRef<{ stack: string[]; index: number }>({ stack: [html], index: 0 });
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [selected, setSelected] = useState<Selected | null>(null);
  /** The block being edited, for the formatting bar, and a way to drop its edit before removing it. */
  const [session, setSession] = useState<{ element: HTMLElement; cancel: () => void; commit: () => void } | null>(null);
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
        // The insertion point may hold the edited block; keep its text current.
        const a = anchor.current;
        if (a && startsWith(path, a.path)) {
          const el2 = resolvePath(sourceTree(), a.path);
          anchor.current = el2 ? { ...a, text: sourceText(el2) } : null;
        }
      },
      onSession: (s) => setSession(s ? { element: s.element, cancel: s.cancel, commit: s.commit } : null),
      onSelect: (sel) => {
        if (!sel) return setSelected(null);
        const atTarget = targetOf(insertionAnchor(sel.element, sel.root), sel.root);
        if (atTarget) anchor.current = atTarget;
        const wrap = wrapRef.current;
        if (!wrap) return setSelected(null);
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

  /**
   * Inserts markup after the part last clicked, or at the end of the note when
   * none was (or it is gone), and opens part of it for editing (design D4).
   */
  const insert = (markup: string, focus: number[] | null) => {
    // Keep any typing in the part being edited first.
    session?.commit();
    const tree = sourceTree();
    const a = anchor.current;
    const found = a ? locateEdited(tree, a.path, a.tag, a.text) : null;
    let next: string;
    let newPath: number[];
    if (a && found?.ok) {
      next = insertAfter(tree.html, found.element, markup);
      newPath = [...a.path.slice(0, -1), a.path[a.path.length - 1] + 1];
    } else {
      ({ html: next, path: newPath } = insertAtEnd(tree, markup));
    }
    const added = resolvePath(parseSource(next), newPath);
    // The next insert goes after this one, so parts added in a row stay in order.
    anchor.current = added ? { path: newPath, tag: added.tagName.toUpperCase(), text: sourceText(added) } : null;
    focusNext.current = focus ? { path: [...newPath, ...focus], caret: "all" } : null;
    setSelected(null);
    apply(next);
  };

  /** Changes the part being edited to another block type, or adds a new part of that type (design D12). */
  const setBlockType = (tag: BlockTag) => {
    const s = session;
    if (!s) return insert(NEW_BLOCK[tag], []);
    if (s.element.tagName.toLowerCase() === tag) return;
    const root = s.element.closest(".vl-doc, .vl-flow");
    s.commit();
    const target = root ? targetOf(s.element, root) : null;
    const found = target ? locateEdited(sourceTree(), target.path, target.tag, target.text) : null;
    if (!target || !found || !found.ok) {
      say("Couldn't change that part. Click it again and retry.");
      return;
    }
    let next: string;
    try {
      next = renameElement(latest.current, found.element, tag);
    } catch (err) {
      say(err instanceof Error ? err.message : "That part can't change type on the page.");
      return;
    }
    const a = anchor.current;
    if (a && a.path.length === target.path.length && startsWith(a.path, target.path)) anchor.current = { ...a, tag: tag.toUpperCase() };
    focusNext.current = { path: target.path, caret: "end" };
    setSelected(null);
    apply(next);
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
    // Removing the insertion point, or something before it, moves it.
    const a = anchor.current;
    if (a && startsWith(a.path, target.path)) anchor.current = null;
    else if (a && startsWith(a.path, target.path.slice(0, -1))) {
      const d = target.path.length - 1;
      if (a.path[d] > target.path[d]) anchor.current = { ...a, path: a.path.map((v, k) => (k === d ? v - 1 : v)) };
    }
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
          <MousePointerClick className="w-3.5 h-3.5" /> Click any text to edit it. Use the bar to add a text box or image after it.
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

      <FormatBar
        element={session?.element ?? null}
        onTextBox={() => insert(NEW_BLOCK.p, [])}
        onImage={() => imageInput.current?.click()}
        imageBusy={imageBusy}
        onBlockType={setBlockType}
      />

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
            aria-label="This part"
            onPointerDown={(e) => e.preventDefault()}
            style={{ top: selected.top }}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-full z-20 flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#BFD3F2] dark:border-[#2C3E5C] shadow-lg text-xs max-w-[95%]"
          >
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
