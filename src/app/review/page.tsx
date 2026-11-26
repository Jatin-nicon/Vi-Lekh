"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Copy, GitMerge, Inbox, Loader2, MessageSquareWarning, X, AlertTriangle, PenLine } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { HtmlDiffViewer } from "@/components/diff/html-diff-viewer";
import { HtmlSandboxedViewer } from "@/components/editor/html-sandboxed-viewer";
import { AnnotationLayer } from "@/components/reader/annotation-layer";
import { blocksToHtml } from "@/lib/editor/block-converter";
import { getVersion } from "@/lib/data/versions";
import { isHtmlDocument } from "@/lib/layout/document-html";
import { mergeSegments, resolveConflicts, type ConflictChoice, type MergeResult } from "@/lib/diff/html-diff";
import { normalizePage, type PageAnnotations } from "@/lib/annotations/annotation-sync";
import { formatDate } from "@/lib/utils";
import {
  errorMessage,
  forkSuggestion,
  getReviewQueue,
  getSuggestion,
  isOutdated,
  mergeSuggestion,
  reviewSuggestion,
  type SuggestionWithContext,
} from "@/lib/data/suggestions";

function Shell({ title, children, back = "/studio" }: { title: React.ReactNode; children: React.ReactNode; back?: string }) {
  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7]">
      <header className="border-b border-[#E8E3D9] dark:border-[#33312E] h-16 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={back} className="p-1.5 rounded-lg hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#757069]" title="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-semibold flex items-center gap-1.5 truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">{children}</main>
    </div>
  );
}

const OutdatedBadge = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
    <AlertTriangle className="w-3 h-3" /> Outdated base, note changed since
  </span>
);

/** Pending suggestions in the courses the user reviews, newest first (task 10.1). */
function ReviewQueue() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<SuggestionWithContext[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getReviewQueue()
      .then((list) => !cancelled && setItems(list))
      .catch((err) => !cancelled && setError(errorMessage(err, "The review queue could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [user]);
  return (
    <Shell title={<><Inbox className="w-4 h-4 text-[#A85D44]" /> Reviews</>}>
      {error && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{error}</p>}
      {isLoading || (user && items === null && !error) ? (
        <p className="text-xs text-[#757069] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : !user ? (
        <p className="text-sm">Sign in to review suggestions.</p>
      ) : items && items.length === 0 ? (
        <p className="text-sm text-[#757069]">No suggestions are waiting for review in your courses.</p>
      ) : (
        <ul className="space-y-3 max-w-3xl">
          {items?.map((s) => (
            <li key={s.id}>
              <Link href={`/review?suggestion=${s.id}`} className="block p-4 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:border-[#A85D44]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{s.note?.title ?? "Note"}</span>
                  {isOutdated(s) && <OutdatedBadge />}
                </div>
                <p className="mt-1 text-xs text-[#757069]" suppressHydrationWarning>
                  by {s.author?.display_name ?? "Unknown"} · submitted {s.submitted_at ? formatDate(s.submitted_at) : "—"}
                  {s.base?.version_number ? ` · based on v${s.base.version_number}` : ""}
                </p>
                {s.summary && <p className="mt-2 text-sm">{s.summary}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

const htmlOf = (blocks: { type: string; content: string }[] | undefined) => (blocks?.length ? blocksToHtml(blocks as never) : "");

/** Read-only overlay of the annotations a contributor attached. */
function AttachedOverlay({ pages, layout, pageIndex, width, height, scale }: {
  pages: Map<string, PageAnnotations>; layout: string; pageIndex: number; width: number; height: number; scale: number;
}) {
  const data = pages.get(`${layout}:${pageIndex + 1}`);
  if (!data) return null;
  const noop = () => {};
  return (
    <AnnotationLayer
      noteId={`review-preview-${layout}`}
      pageNumber={pageIndex + 1}
      layout={layout === "html-page" ? "html-page" : "html-a4"}
      scale={scale}
      intrinsicWidth={width}
      intrinsicHeight={height}
      renderedWidth={width * scale}
      renderedHeight={height * scale}
      tool={null}
      color="#000"
      strokes={data.strokes}
      onChangeStrokes={noop}
      shapes={data.shapes}
      onChangeShapes={noop}
      textBoxes={data.textBoxes}
      onChangeTextBoxes={noop}
    />
  );
}

/** One suggestion: diff, annotations, and the reviewer's actions (tasks 10.2–10.5). */
function ReviewSuggestion({ id }: { id: string }) {
  const { user, isLoading } = useAuth();
  const [s, setS] = useState<SuggestionWithContext | null | undefined>(undefined);
  const [baseHtml, setBaseHtml] = useState("");
  const [currentHtml, setCurrentHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"changes" | "proposed">("changes");
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [action, setAction] = useState<null | "merge" | "fork" | "reject" | "request_changes">(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<React.ReactNode>(null);
  const [feedback, setFeedback] = useState("");
  const [forkTitle, setForkTitle] = useState("");
  const [publishAnnotations, setPublishAnnotations] = useState(false);
  const [choices, setChoices] = useState<(ConflictChoice | undefined)[]>([]);

  const load = useCallback(async () => {
    try {
      const sug = await getSuggestion(id);
      setS(sug);
      if (!sug) return;
      setForkTitle(`${sug.note?.title ?? "Note"} (${sug.author?.display_name ?? "Contributor"}'s version)`);
      const [base, current] = await Promise.all([
        sug.base_revision_id ? getVersion(sug.base_revision_id) : null,
        sug.note?.current_revision_id ? getVersion(sug.note.current_revision_id) : null,
      ]);
      setBaseHtml(htmlOf(base?.blocks));
      setCurrentHtml(htmlOf(current?.blocks));
    } catch (err) {
      setError(errorMessage(err, "The suggestion could not be loaded."));
    }
  }, [id]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [user, load]);

  const outdated = s ? isOutdated(s) : false;
  const merge: MergeResult | null = useMemo(
    () => (s && outdated && typeof DOMParser !== "undefined" ? mergeSegments(baseHtml, currentHtml, s.html) : null),
    [s, outdated, baseHtml, currentHtml],
  );
  const conflicts = merge?.hunks.filter((h) => h.type === "conflict") ?? [];
  const allChosen = conflicts.every((_, i) => choices[i]);

  const attached = useMemo(() => {
    const map = new Map<string, PageAnnotations>();
    for (const p of (s?.attached_annotations ?? []) as { layout: string; page_number: number; data: Partial<PageAnnotations> }[]) {
      map.set(`${p.layout}:${p.page_number}`, normalizePage(p.data));
    }
    return map;
  }, [s]);
  const proposedLayout = s && isHtmlDocument(s.html) ? "html-page" : "html-a4";

  const run = async (fn: () => Promise<React.ReactNode>) => {
    setBusy(true);
    setError(null);
    try {
      setDone(await fn());
      setAction(null);
    } catch (err) {
      const e = err as { code?: string };
      setError(
        e?.code === "40001"
          ? "Someone published a new version of this note while you were reviewing. Reload to review against it."
          : errorMessage(err, "That didn't work."),
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || (user && s === undefined && !error)) {
    return <Shell title="Review" back="/review"><p className="text-xs text-[#757069] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p></Shell>;
  }
  if (!user) return <Shell title="Review" back="/review"><p className="text-sm">Sign in to review suggestions.</p></Shell>;
  if (!s) {
    return (
      <Shell title="Review" back="/review">
        <p className="text-sm">{error ?? "This suggestion doesn't exist, or you aren't a reviewer of its course."}</p>
      </Shell>
    );
  }

  const noteHref = s.note ? `/notes?course=${s.note.course_id}&note=${s.note_id}` : "/";
  const pending = s.status === "pending";
  const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50";

  return (
    <Shell title={<>Review: {s.note?.title}</>} back="/review">
      <section className="p-4 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{s.summary || "No summary"}</span>
          {outdated && pending && <OutdatedBadge />}
        </div>
        <p className="text-xs text-[#757069]" suppressHydrationWarning>
          by {s.author?.display_name ?? "Unknown"} · submitted {s.submitted_at ? formatDate(s.submitted_at) : "—"} · based on v
          {s.base?.version_number ?? "?"} · <Link href={noteHref} className="underline">open the note</Link>
        </p>
        {!pending && <p className="text-xs">This suggestion is no longer pending ({s.status.replace("_", " ")}).</p>}
      </section>

      {done && (
        <div role="status" className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300">
          {done}
        </div>
      )}
      {error && <p role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs text-red-800 dark:text-red-300">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => setView("changes")} className={`${btn} ${view === "changes" ? "bg-[#2D2926] text-white" : "border border-[#E8E3D9] dark:border-[#33312E]"}`}>
          Changes from v{s.base?.version_number ?? "?"}
        </button>
        <button type="button" onClick={() => setView("proposed")} className={`${btn} ${view === "proposed" ? "bg-[#2D2926] text-white" : "border border-[#E8E3D9] dark:border-[#33312E]"}`}>
          Proposed version
        </button>
        {view === "proposed" && attached.size > 0 && (
          <label className="inline-flex items-center gap-1.5 ml-2 cursor-pointer">
            <input type="checkbox" checked={showAnnotations} onChange={(e) => setShowAnnotations(e.target.checked)} />
            <PenLine className="w-3.5 h-3.5" /> Show the contributor&apos;s annotations
          </label>
        )}
      </div>

      {view === "changes" ? (
        <HtmlDiffViewer baseHtml={baseHtml} proposedHtml={s.html} baseLabel={`v${s.base?.version_number ?? "?"}`} proposedLabel="Suggestion" />
      ) : (
        <div className="rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#EFEBE3] dark:bg-[#161514] p-2 sm:p-6">
          <HtmlSandboxedViewer
            html={s.html}
            paged
            renderPageOverlay={
              showAnnotations && attached.size
                ? (i, info) => (
                    <div className="absolute inset-0">
                      <AttachedOverlay pages={attached} layout={proposedLayout} pageIndex={i} width={info.pageWidth} height={info.pageHeight} scale={info.scale} />
                    </div>
                  )
                : undefined
            }
          />
        </div>
      )}

      {pending && !done && (
        <section className="p-4 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAction("merge")} className={`${btn} bg-emerald-700 hover:bg-emerald-800 text-white`}>
              <GitMerge className="w-3.5 h-3.5" /> Merge into note
            </button>
            <button type="button" onClick={() => setAction("fork")} className={`${btn} border border-[#E8E3D9] dark:border-[#33312E]`}>
              <Copy className="w-3.5 h-3.5" /> Save as separate copy
            </button>
            <button type="button" onClick={() => setAction("request_changes")} className={`${btn} border border-[#E8E3D9] dark:border-[#33312E]`}>
              <MessageSquareWarning className="w-3.5 h-3.5" /> Request changes
            </button>
            <button type="button" onClick={() => setAction("reject")} className={`${btn} border border-red-300 text-red-700 dark:text-red-400`}>
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>

          {action === "merge" && (
            <div className="space-y-3 border-t border-[#E8E3D9] dark:border-[#33312E] pt-3 text-xs">
              {!outdated ? (
                <p>The note hasn&apos;t changed since this suggestion started, so the proposed version becomes the new current version.</p>
              ) : merge?.clean ? (
                <p>The note has changed since, but the changes don&apos;t overlap. They&apos;ll be combined automatically.</p>
              ) : (
                <div className="space-y-3">
                  <p>
                    The note has changed since this suggestion started, and {conflicts.length} section{conflicts.length === 1 ? "" : "s"} were
                    changed in both. Choose which to keep for each:
                  </p>
                  {conflicts.map((h, i) =>
                    h.type !== "conflict" ? null : (
                      <fieldset key={i} className="p-3 rounded-lg border border-amber-300 dark:border-amber-900/60 space-y-2">
                        <legend className="px-1 font-semibold">Conflict {i + 1}</legend>
                        {(["current", "suggestion"] as const).map((side) => (
                          <label key={side} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`conflict-${i}`}
                              checked={choices[i] === side}
                              onChange={() => setChoices((c) => Object.assign([...c], { [i]: side }))}
                              className="mt-0.5"
                            />
                            <span>
                              <strong>{side === "current" ? "Keep current" : "Use suggestion"}:</strong>{" "}
                              <span className="text-[#757069]">
                                {(side === "current" ? h.current : h.proposed).map((x) => x.text).join(" ").slice(0, 280) || "(nothing)"}
                              </span>
                            </span>
                          </label>
                        ))}
                      </fieldset>
                    ),
                  )}
                </div>
              )}
              {attached.size > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={publishAnnotations} onChange={(e) => setPublishAnnotations(e.target.checked)} />
                  Publish the contributor&apos;s annotations with this version
                </label>
              )}
              <button
                type="button"
                disabled={busy || (outdated && !merge?.clean && !allChosen)}
                onClick={() =>
                  run(async () => {
                    const html = !outdated ? s.html : merge!.clean ? merge!.html! : resolveConflicts(merge!, choices as ConflictChoice[]);
                    const v = await mergeSuggestion(s.id, html, s.note?.current_revision_id ?? null, publishAnnotations);
                    return <>Merged as v{v.version_number}. <Link href={noteHref} className="underline">Open the note</Link></>;
                  })
                }
                className={`${btn} bg-emerald-700 text-white`}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Publish merged version
              </button>
            </div>
          )}

          {action === "fork" && (
            <div className="space-y-2 border-t border-[#E8E3D9] dark:border-[#33312E] pt-3 text-xs">
              <label htmlFor="fork-title" className="block font-medium">Title of the new note</label>
              <input
                id="fork-title"
                value={forkTitle}
                onChange={(e) => setForkTitle(e.target.value)}
                className="w-full max-w-lg p-2 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716]"
              />
              <p className="text-[#757069]">The original note stays as it is. The copy goes in the same module and links back to it.</p>
              <button
                type="button"
                disabled={busy || !forkTitle.trim()}
                onClick={() =>
                  run(async () => {
                    const n = await forkSuggestion(s.id, forkTitle);
                    return <>Saved as a new note. <Link href={`/notes?course=${n.course_id}&note=${n.id}`} className="underline">Open the copy</Link></>;
                  })
                }
                className={`${btn} bg-[#2D2926] text-white`}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />} Create copy
              </button>
            </div>
          )}

          {(action === "reject" || action === "request_changes") && (
            <div className="space-y-2 border-t border-[#E8E3D9] dark:border-[#33312E] pt-3 text-xs">
              <label htmlFor="feedback" className="block font-medium">
                {action === "reject" ? "Why are you rejecting it?" : "What should the contributor change?"} <span className="text-red-600">*</span>
              </label>
              <textarea
                id="feedback"
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full max-w-2xl p-2 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716]"
              />
              <button
                type="button"
                disabled={busy || !feedback.trim()}
                onClick={() =>
                  run(async () => {
                    await reviewSuggestion(s.id, action, feedback);
                    return action === "reject"
                      ? "Rejected. The contributor can see your feedback."
                      : "Sent back to the contributor with your feedback. It will return to this queue when they resubmit.";
                  })
                }
                className={`${btn} ${action === "reject" ? "bg-red-600 text-white" : "bg-[#2D2926] text-white"}`}
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {action === "reject" ? "Reject suggestion" : "Request changes"}
              </button>
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}

function ReviewContent() {
  const id = useSearchParams().get("suggestion");
  return id ? <ReviewSuggestion id={id} /> : <ReviewQueue />;
}

export default function ReviewPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}>
        <ReviewContent />
      </Suspense>
    </AuthProvider>
  );
}
