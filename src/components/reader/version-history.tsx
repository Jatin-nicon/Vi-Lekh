"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { History, X, Loader2, RotateCcw, GitCompare, ArrowLeft, AlertCircle } from "lucide-react";
import { describeSource, getVersionHistory, type VersionSummary } from "@/lib/data/versions";
import { formatDate } from "@/lib/utils";

/** Slide-over list of a note's published versions, newest first (task 11.1). */
export function VersionHistoryPanel({
  noteId,
  currentRevisionId,
  viewingId,
  onView,
  onClose,
}: {
  noteId: string;
  currentRevisionId?: string | null;
  viewingId?: string | null;
  onView: (id: string) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVersionHistory(noteId)
      .then((list) => !cancelled && setVersions(list))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Could not load the history."));
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const numberById = useMemo(() => new Map((versions ?? []).map((v) => [v.id, v.version_number])), [versions]);

  return createPortal(
    <div className="print:hidden fixed inset-0 z-[96] flex justify-end bg-black/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Version history"
        className="h-full w-full max-w-sm bg-[#FAF8F5] dark:bg-[#21201E] border-l border-[#E8E3D9] dark:border-[#33312E] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#E8E3D9] dark:border-[#33312E]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#2D2926] dark:text-[#E3DFD7]">
            <History className="w-4 h-4 text-[#A85D44]" /> Version history
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] cursor-pointer" aria-label="Close history">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3">
          {error ? (
            <p className="text-xs text-red-700 dark:text-red-400 flex gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>
          ) : versions === null ? (
            <p className="text-xs text-[#757069] flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading versions…</p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-[#757069]">No published versions yet.</p>
          ) : (
            <ol className="space-y-2">
              {versions.map((v) => {
                const isCurrent = v.id === currentRevisionId;
                const isViewing = v.id === viewingId || (!viewingId && isCurrent);
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => onView(v.id)}
                      aria-current={isViewing ? "true" : undefined}
                      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                        isViewing
                          ? "border-[#A85D44] bg-[#FAF4EC] dark:bg-[#2A231F]"
                          : "border-[#E8E3D9] dark:border-[#33312E] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#2D2926] dark:text-[#E3DFD7]">v{v.version_number}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#5D7063]/15 text-[#5D7063] dark:text-[#768D7D]">Current</span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#757069] dark:text-[#948F86]" suppressHydrationWarning>
                        {formatDate(v.created_at)} · {describeSource(v, numberById)}
                      </div>
                      <div className="mt-1 text-[11px] text-[#757069] dark:text-[#948F86]">
                        by {v.author?.display_name ?? "Unknown"}
                        {v.merger && v.merger.display_name !== v.author?.display_name ? `, merged by ${v.merger.display_name}` : ""}
                      </div>
                      {v.change_summary && (
                        <p className="mt-1 text-xs text-[#2D2926] dark:text-[#E3DFD7] line-clamp-2">{v.change_summary}</p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

/** Banner shown while a past version is open (task 11.2, 11.3). */
export function PastVersionBanner({
  versionNumber,
  createdAt,
  comparing,
  canRestore,
  restoring,
  error,
  onCompare,
  onRestore,
  onBack,
}: {
  versionNumber: number;
  createdAt: string;
  comparing: boolean;
  canRestore: boolean;
  restoring: boolean;
  error: string | null;
  onCompare: () => void;
  onRestore: () => void;
  onBack: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const btn =
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer transition-colors disabled:opacity-50";
  return (
    <div role="status" className="print:hidden mb-4 p-3 rounded-lg bg-[#EEF4FF] dark:bg-[#1B2433] border border-[#BFD3F2] dark:border-[#2C3E5C] text-xs text-[#1E3A8A] dark:text-[#AFC6F0]">
      <div className="flex flex-wrap items-center gap-2">
        <History className="w-4 h-4 shrink-0" />
        <span className="flex-1 min-w-[12rem]" suppressHydrationWarning>
          Viewing <strong>v{versionNumber}</strong> from {formatDate(createdAt)}, not the current version.
          {!comparing && " Annotation tools are off while viewing a past version."}
        </span>
        <button type="button" onClick={onCompare} className={`${btn} border-[#BFD3F2] dark:border-[#2C3E5C] bg-white/70 dark:bg-transparent`}>
          <GitCompare className="w-3.5 h-3.5" /> {comparing ? "Show this version" : "Compare with current"}
        </button>
        {canRestore && !confirming && (
          <button type="button" onClick={() => setConfirming(true)} className={`${btn} border-[#A85D44] text-[#A85D44] bg-white/70 dark:bg-transparent`}>
            <RotateCcw className="w-3.5 h-3.5" /> Restore this version
          </button>
        )}
        <button type="button" onClick={onBack} className={`${btn} border-transparent bg-[#1E3A8A] text-white hover:bg-[#1A3170]`}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to current
        </button>
      </div>
      {confirming && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#BFD3F2] dark:border-[#2C3E5C] pt-2">
          <span className="flex-1 min-w-[12rem]">
            Publish v{versionNumber}&apos;s content as a new version? The current version stays in the history, so this can be undone.
          </span>
          <button type="button" disabled={restoring} onClick={onRestore} className={`${btn} border-transparent bg-[#A85D44] text-white hover:bg-[#8F4C35]`}>
            {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Restore v{versionNumber}
          </button>
          <button type="button" disabled={restoring} onClick={() => setConfirming(false)} className={`${btn} border-[#BFD3F2] dark:border-[#2C3E5C]`}>
            Cancel
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
