"use client";

import React, { useMemo, useState, useSyncExternalStore } from "react";
import { Code2, Eye } from "lucide-react";
import { HtmlSandboxedViewer, type PagedLayoutInfo } from "@/components/editor/html-sandboxed-viewer";
import { diffSource } from "@/lib/diff/html-diff";
import { renderSegmentDiff } from "@/lib/diff/render-diff";

export type HtmlDiffMode = "rendered" | "source";

interface HtmlDiffViewerProps {
  baseHtml: string;
  proposedHtml: string;
  /** Labels for the two sides, e.g. "v3" and "Suggestion". */
  baseLabel?: string;
  proposedLabel?: string;
  /** Controlled mode; omit to let the viewer manage it. */
  mode?: HtmlDiffMode;
  onModeChange?: (mode: HtmlDiffMode) => void;
  /** Passed to the paged viewer in rendered mode, e.g. an annotation overlay. */
  renderPageOverlay?: (pageIndex: number, info: PagedLayoutInfo) => React.ReactNode;
  className?: string;
}

const noopSubscribe = () => () => {};
/** True in the browser, false during server rendering (the diff needs DOMParser). */
function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Unchanged lines kept around each change in source mode. */
const CONTEXT_LINES = 3;

interface SourceRow {
  kind: "add" | "del" | "same" | "skip";
  oldNo?: number;
  newNo?: number;
  text: string;
}

function buildSourceRows(baseHtml: string, proposedHtml: string): SourceRow[] {
  const rows: SourceRow[] = [];
  let oldNo = 1;
  let newNo = 1;
  for (const change of diffSource(baseHtml, proposedHtml)) {
    const lines = change.value.replace(/\n$/, "").split("\n");
    for (const text of lines) {
      if (change.added) rows.push({ kind: "add", newNo: newNo++, text });
      else if (change.removed) rows.push({ kind: "del", oldNo: oldNo++, text });
      else rows.push({ kind: "same", oldNo: oldNo++, newNo: newNo++, text });
    }
  }
  // Collapse long unchanged runs, keeping CONTEXT_LINES around changes.
  const keep = rows.map((r) => r.kind !== "same");
  rows.forEach((r, i) => {
    if (r.kind === "same") return;
    for (let d = 1; d <= CONTEXT_LINES; d++) {
      if (i - d >= 0) keep[i - d] = true;
      if (i + d < rows.length) keep[i + d] = true;
    }
  });
  const out: SourceRow[] = [];
  for (let i = 0; i < rows.length; ) {
    if (keep[i]) {
      out.push(rows[i++]);
      continue;
    }
    let j = i;
    while (j < rows.length && !keep[j]) j++;
    out.push({ kind: "skip", text: `${j - i} unchanged line${j - i === 1 ? "" : "s"}` });
    i = j;
  }
  return out;
}

const ROW_STYLE: Record<SourceRow["kind"], string> = {
  add: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200",
  del: "bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200",
  same: "text-[#2D2926] dark:text-[#E3DFD7]",
  skip: "bg-[#F2EDE4] dark:bg-[#22201E] text-[#757069] dark:text-[#948F86] italic",
};

const MARK: Record<SourceRow["kind"], string> = { add: "+", del: "−", same: " ", skip: "⋯" };

/**
 * Shows the changes between two HTML versions of a note (design D8):
 * a rendered view on the paged A4 layout, or an HTML source line diff.
 */
export function HtmlDiffViewer({
  baseHtml,
  proposedHtml,
  baseLabel = "Base",
  proposedLabel = "Proposed",
  mode: controlledMode,
  onModeChange,
  renderPageOverlay,
  className = "",
}: HtmlDiffViewerProps) {
  const [internalMode, setInternalMode] = useState<HtmlDiffMode>("rendered");
  const mode = controlledMode ?? internalMode;
  const setMode = (m: HtmlDiffMode) => {
    if (controlledMode === undefined) setInternalMode(m);
    onModeChange?.(m);
  };

  const isClient = useIsClient();
  const rendered = useMemo(
    () =>
      isClient
        ? renderSegmentDiff(baseHtml, proposedHtml)
        : { html: "", summary: { added: 0, removed: 0, changed: 0, unchanged: 0 } },
    [isClient, baseHtml, proposedHtml],
  );
  const sourceRows = useMemo(
    () => (isClient && mode === "source" ? buildSourceRows(baseHtml, proposedHtml) : []),
    [isClient, mode, baseHtml, proposedHtml],
  );
  const { added, removed, changed } = rendered.summary;
  const noChanges = added + removed + changed === 0;

  const tab = (m: HtmlDiffMode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      aria-pressed={mode === m}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
        mode === m
          ? "bg-white dark:bg-[#1E1D1B] text-[#A85D44] dark:text-[#C4785E] shadow-xs font-semibold"
          : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926] dark:hover:text-[#E3DFD7]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#757069] dark:text-[#948F86]">
          <span>
            <span className="font-semibold text-[#2D2926] dark:text-[#E3DFD7]">{baseLabel}</span> →{" "}
            <span className="font-semibold text-[#2D2926] dark:text-[#E3DFD7]">{proposedLabel}</span>
          </span>
          {!isClient ? (
            <span>Comparing…</span>
          ) : noChanges ? (
            <span>No changes</span>
          ) : (
            <span className="flex items-center gap-2 font-medium">
              {added > 0 && <span className="text-emerald-700 dark:text-emerald-400">+{added} added</span>}
              {changed > 0 && <span className="text-amber-700 dark:text-amber-400">{changed} changed</span>}
              {removed > 0 && <span className="text-red-700 dark:text-red-400">−{removed} removed</span>}
            </span>
          )}
        </div>
        <div className="inline-flex items-center p-0.5 rounded-lg bg-[#EFEBE3] dark:bg-[#2B2A27] border border-[#E8E3D9] dark:border-[#383532] font-medium">
          {tab("rendered", <Eye className="w-3.5 h-3.5" />, "Rendered")}
          {tab("source", <Code2 className="w-3.5 h-3.5" />, "Source")}
        </div>
      </div>

      {mode === "rendered" ? (
        <div className="rounded-2xl bg-[#EFEBE3] dark:bg-[#161514] border border-[#E8E3D9] dark:border-[#33312E] p-2 sm:p-6">
          <HtmlSandboxedViewer html={rendered.html} paged renderPageOverlay={renderPageOverlay} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#181615]">
          <table className="w-full border-collapse font-mono text-[12px] leading-relaxed">
            <tbody>
              {sourceRows.map((row, i) => (
                <tr key={i} className={ROW_STYLE[row.kind]}>
                  <td className="w-10 select-none border-r border-[#E8E3D9] dark:border-[#33312E] px-2 text-right text-[#A8A196]">
                    {row.oldNo ?? ""}
                  </td>
                  <td className="w-10 select-none border-r border-[#E8E3D9] dark:border-[#33312E] px-2 text-right text-[#A8A196]">
                    {row.newNo ?? ""}
                  </td>
                  <td className="w-5 select-none px-1 text-center" aria-hidden="true">
                    {MARK[row.kind]}
                  </td>
                  <td className="whitespace-pre px-2">
                    {row.kind === "add" && <span className="sr-only">Added: </span>}
                    {row.kind === "del" && <span className="sr-only">Removed: </span>}
                    {row.text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
