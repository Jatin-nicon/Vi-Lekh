"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, X } from "lucide-react";
import { HtmlSandboxedViewer } from "@/components/editor/html-sandboxed-viewer";
import { renderMathInHtml } from "@/lib/editor/math-html";
import { CHANGE_CSS, DIFF_ATTR, markChanges } from "@/lib/editor/block-diff";

const STYLE_ID = "vl-change-style";

function addChangeStyle(root: HTMLElement) {
  const shadow = root.getRootNode();
  if (!(shadow instanceof ShadowRoot) || shadow.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CHANGE_CSS;
  shadow.appendChild(style);
}

/**
 * "Review your changes" (design D9): the version the draft started from and
 * the draft, side by side with linked scrolling and the changed blocks
 * highlighted. On narrow screens Before and After are tabs.
 */
export function ReviewChanges({
  baseHtml,
  draftHtml,
  baseLabel,
  onBack,
  onContinue,
}: {
  baseHtml: string;
  draftHtml: string;
  baseLabel: string;
  onBack: () => void;
  /** Omitted when the screen is only for looking (no submit step). */
  onContinue?: () => void;
}) {
  const unchanged = baseHtml === draftHtml;
  const before = useMemo(() => renderMathInHtml(baseHtml), [baseHtml]);
  const after = useMemo(() => renderMathInHtml(draftHtml), [draftHtml]);
  const rootsRef = useRef<{ before: HTMLElement | null; after: HTMLElement | null }>({ before: null, after: null });
  const [count, setCount] = useState<number | null>(null);
  const [tab, setTab] = useState<"before" | "after">("after");
  const [current, setCurrent] = useState(-1);
  const beforePane = useRef<HTMLDivElement>(null);
  const afterPane = useRef<HTMLDivElement>(null);
  const pane = (side: "before" | "after") => (side === "before" ? beforePane : afterPane).current;
  const syncing = useRef(false);

  // Mark changes whenever both versions are on screen.
  const onRoot = useCallback(
    (side: "before" | "after", root: HTMLElement | null) => {
      const roots = rootsRef.current;
      roots[side] = root;
      if (!roots.before || !roots.after) return;
      addChangeStyle(roots.before);
      addChangeStyle(roots.after);
      setCount(unchanged ? 0 : markChanges(roots.before, roots.after));
    },
    [unchanged],
  );
  const onBefore = useCallback((r: HTMLElement | null) => onRoot("before", r), [onRoot]);
  const onAfter = useCallback((r: HTMLElement | null) => onRoot("after", r), [onRoot]);

  // Linked scrolling, by proportion of each column's height.
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const from = e.currentTarget === beforePane.current ? "before" : "after";
    if (syncing.current) {
      syncing.current = false;
      return;
    }
    const a = pane(from);
    const b = pane(from === "before" ? "after" : "before");
    if (!a || !b || b.offsetParent === null) return;
    const ratio = a.scrollTop / Math.max(1, a.scrollHeight - a.clientHeight);
    const target = ratio * Math.max(0, b.scrollHeight - b.clientHeight);
    if (Math.abs(b.scrollTop - target) < 1) return;
    syncing.current = true;
    b.scrollTop = target;
  };

  /** Scrolls both columns to the next or previous change on the After side (or Before, for removals). */
  const jump = (delta: 1 | -1) => {
    const roots = rootsRef.current;
    const list = [
      ...(roots.after ? Array.from(roots.after.querySelectorAll<HTMLElement>(`[${DIFF_ATTR}]`)).map((el) => ({ el, side: "after" as const })) : []),
    ];
    const removed = roots.before ? Array.from(roots.before.querySelectorAll<HTMLElement>(`[${DIFF_ATTR}="removed"]`)) : [];
    const items = list.length ? list : removed.map((el) => ({ el, side: "before" as const }));
    if (!items.length) return;
    const next = (current + delta + items.length) % items.length;
    setCurrent(next);
    const { el, side } = items[next];
    const box = pane(side);
    if (!box) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - box.clientHeight / 3;
    box.scrollTo({ top, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer";
  return (
    <div role="dialog" aria-label="Review your changes" className="fixed inset-0 z-[90] flex flex-col bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7]">
      <header className="shrink-0 border-b border-[#E8E3D9] dark:border-[#33312E] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Review your changes</h2>
          <p className="text-[11px] text-[#757069] dark:text-[#948F86]" role="status">
            {unchanged
              ? "No changes yet. Edit the page, then come back here."
              : count === null
                ? "Comparing…"
                : `${count} ${count === 1 ? "part" : "parts"} highlighted: yellow changed, green added, red removed.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!unchanged && (count ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => jump(-1)} className={`${btn} border border-[#E8E3D9] dark:border-[#33312E]`} title="Previous change">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => jump(1)} className={`${btn} border border-[#E8E3D9] dark:border-[#33312E]`} title="Next change">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button type="button" onClick={onBack} className={`${btn} border border-[#E8E3D9] dark:border-[#33312E]`}>
            {onContinue ? <ArrowLeft className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />} Back to editing
          </button>
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              disabled={unchanged}
              className={`${btn} bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold`}
            >
              Continue to submit <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>
      <div className="md:hidden shrink-0 flex gap-1 p-2 border-b border-[#E8E3D9] dark:border-[#33312E]" role="tablist">
        {(["before", "after"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${tab === t ? "bg-white dark:bg-[#21201E] text-[#2563EB] shadow-sm" : "text-[#757069]"}`}
          >
            {t === "before" ? `Before (${baseLabel})` : "After (your draft)"}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 flex gap-4 p-3 sm:p-4">
        <Column side="before" title={`Before (${baseLabel})`} html={before} onRoot={onBefore} visible={tab === "before"} paneRef={beforePane} onScroll={onScroll} />
        <Column side="after" title="After (your draft)" html={after} onRoot={onAfter} visible={tab === "after"} paneRef={afterPane} onScroll={onScroll} />
      </div>
    </div>
  );
}

function Column({
  side,
  title,
  html,
  onRoot,
  visible,
  paneRef,
  onScroll,
}: {
  side: "before" | "after";
  title: string;
  html: string;
  onRoot: (root: HTMLElement | null) => void;
  /** Shown on narrow screens (tabs); both columns show on wider screens. */
  visible: boolean;
  paneRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <section aria-label={title} className={`${visible ? "flex" : "hidden"} md:flex flex-col min-h-0 min-w-0 flex-1`}>
      <h3 className="hidden md:flex items-center gap-2 px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-[#757069] dark:text-[#948F86]">
        <span className={`h-2 w-2 rounded-full ${side === "before" ? "bg-[#9C978E]" : "bg-[#2563EB]"}`} /> {title}
      </h3>
      <div
        ref={paneRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#EFEBE3] dark:bg-[#161514] p-2"
      >
        <HtmlSandboxedViewer html={html} paged onContentRoot={onRoot} />
      </div>
    </section>
  );
}
