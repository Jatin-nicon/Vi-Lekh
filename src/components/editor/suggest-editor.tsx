"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Columns2, Loader2, Send, Trash2, MessageSquareWarning, GitPullRequestDraft } from "lucide-react";
import { PageEditor } from "@/components/editor/page-editor";
import { LeaveCommentDialog } from "@/components/reader/note-comments";
import type { CommentAnchor } from "@/lib/data/comments";
import { ReviewChanges } from "@/components/editor/review-changes";
import { blocksToHtml } from "@/lib/editor/block-converter";
import { getVersion } from "@/lib/data/versions";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import type { Contributor } from "@/lib/editor/contribution-snippets";
import type { Note } from "@/lib/supabase/types";
import {
  SUMMARY_MAX,
  discardDraft,
  errorMessage,
  getOrCreateDraft,
  saveDraft,
  submitSuggestion,
  type Suggestion,
} from "@/lib/data/suggestions";

const AUTOSAVE_MS = 2000;

/**
 * The editor in suggest mode: the contributor edits the rendered page (no
 * HTML code view); edits go into their private draft for this note,
 * autosaved, and are submitted for review instead of published.
 */
export function SuggestEditor({
  note,
  currentRevisionId,
  currentHtml,
  userId,
  contributor,
}: {
  note: Note;
  currentRevisionId: string;
  currentHtml: string;
  userId: string;
  contributor: Contributor | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Suggestion | null>(null);
  const [html, setHtml] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [submitOpen, setSubmitOpen] = useState(false);
  /** The before/after screen: before submitting, or just to look. */
  const [review, setReview] = useState<"submit" | "look" | null>(null);
  const [base, setBase] = useState<{ html: string; label: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  /** A part that can't be edited on the page, being commented on instead. */
  const [commentOn, setCommentOn] = useState<CommentAnchor | null>(null);
  const [commentSent, setCommentSent] = useState(false);
  const commentInstead = useCallback((anchor: CommentAnchor) => {
    setCommentSent(false);
    setCommentOn(anchor);
  }, []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ id: "", html: "" });

  // One open/create request per note and user, even if the effect runs twice.
  const opening = useRef<{ key: string; promise: Promise<Suggestion> } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const key = `${note.id}|${userId}`;
    if (opening.current?.key !== key) {
      opening.current = { key, promise: getOrCreateDraft(note.id, userId, currentRevisionId, currentHtml) };
    }
    opening.current.promise
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        setHtml(d.html);
        latest.current = { id: d.id, html: d.html };
        return loadBase(d.base_revision_id, currentRevisionId, currentHtml).then((b) => !cancelled && setBase(b));
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err, "Your draft could not be opened.")));
    return () => {
      cancelled = true;
    };
  }, [note.id, userId, currentRevisionId, currentHtml]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { id, html: value } = latest.current;
    if (!id) return;
    setSaveState("saving");
    try {
      await saveDraft(id, value);
      if (latest.current.html === value) setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  const onChange = useCallback((value: string) => {
    setHtml(value);
    latest.current.html = value;
    setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
  }, [flush]);

  // Save pending edits when leaving the page.
  useEffect(() => () => {
    if (timer.current) void flush();
  }, [flush]);

  const back = `/notes?course=${note.course_id}&note=${note.id}`;

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center bg-[#F5F2EB] dark:bg-[#181716]">
        <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
        <Link href={back} className="text-xs text-[#A85D44] underline">Back to the note</Link>
      </div>
    );
  }
  if (!draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EB] dark:bg-[#181716] text-[#757069]">
        <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
        <span className="text-sm">Opening your draft…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7]">
      <header className="border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={back} className="p-1.5 rounded-lg hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#757069]" title="Back to the note">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-[#2563EB]">
                <GitPullRequestDraft className="w-3 h-3" /> Suggesting edits
              </div>
              <div className="text-sm font-semibold truncate">{note.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-[11px] text-[#757069] dark:text-[#948F86] hidden sm:inline" role="status">
              {saveState === "saving" ? "Saving draft…" : saveState === "error" ? "Couldn't save — retrying when you type" : "Draft saved"}
            </span>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="p-4 rounded-xl bg-[#EEF4FF] dark:bg-[#1B2433] border border-[#BFD3F2] dark:border-[#2C3E5C] text-xs text-[#1E3A8A] dark:text-[#AFC6F0] leading-relaxed">
          You&apos;re suggesting changes. Nothing changes in the published note until a course editor reviews and merges your
          suggestion. Your draft is private and saved as you type, so you can leave and come back.
        </div>

        {draft.status === "changes_requested" && draft.reviewer_feedback && (
          <div role="status" className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex gap-2">
            <MessageSquareWarning className="w-4 h-4 shrink-0 mt-px" />
            <div>
              <strong>The reviewer asked for changes:</strong>
              <p className="mt-1 whitespace-pre-wrap">{draft.reviewer_feedback}</p>
            </div>
          </div>
        )}

        {commentSent && (
          <div role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-200">
            Your comment was sent to the course&apos;s reviewers. You can find it under Comments on the note.
          </div>
        )}

        <PageEditor
          html={html}
          onChange={onChange}
          contributor={contributor}
          onUneditable={commentInstead}
        />
        {commentOn && (
          <LeaveCommentDialog
            noteId={note.id}
            revisionId={currentRevisionId}
            authorId={userId}
            anchor={commentOn}
            onClose={() => setCommentOn(null)}
            onSent={() => {
              setCommentOn(null);
              setCommentSent(true);
            }}
          />
        )}

        <div className="p-5 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {confirmDiscard ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span>Delete this draft? This can&apos;t be undone; the published note stays as it is.</span>
              <button
                type="button"
                onClick={async () => {
                  if (timer.current) clearTimeout(timer.current);
                  latest.current.id = "";
                  await discardDraft(draft.id).catch(() => {});
                  router.push(back);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Delete draft
              </button>
              <button type="button" onClick={() => setConfirmDiscard(false)} className="px-3 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] cursor-pointer">
                Keep it
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#757069] hover:text-red-600 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Discard draft
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setReview("look")}
            disabled={!base}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] hover:border-[#2563EB] hover:text-[#2563EB] disabled:opacity-50 text-xs sm:text-sm font-medium cursor-pointer"
          >
            <Columns2 className="w-4 h-4" /> Review changes
          </button>
          <button
            type="button"
            disabled={!base}
            onClick={async () => {
              await flush();
              setReview("submit");
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Send className="w-4 h-4" /> Submit for review
          </button>
          </div>
        </div>
      </main>

      {review && base && (
        <ReviewChanges
          baseHtml={base.html}
          draftHtml={html}
          baseLabel={base.label}
          onBack={() => setReview(null)}
          onContinue={
            review === "submit"
              ? () => {
                  setReview(null);
                  setSubmitOpen(true);
                }
              : undefined
          }
        />
      )}

      {submitOpen && (
        <SubmitDialog
          draft={draft}
          onClose={() => setSubmitOpen(false)}
          onSubmitted={() => router.push(`/suggestions?submitted=${draft.id}`)}
        />
      )}
    </div>
  );
}

/** The version a draft started from: the current one, or an earlier published version. */
async function loadBase(baseId: string | null, currentId: string, currentHtml: string): Promise<{ html: string; label: string }> {
  if (!baseId || baseId === currentId) return { html: currentHtml, label: "current version" };
  const v = await getVersion(baseId);
  if (!v) return { html: currentHtml, label: "current version" };
  return { html: blocksToHtml(v.blocks), label: v.version_number ? `version ${v.version_number}` : "earlier version" };
}

/** Summary and "include my annotations", then submit (task 9.4). */
function SubmitDialog({ draft, onClose, onSubmitted }: { draft: Suggestion; onClose: () => void; onSubmitted: () => void }) {
  const [summary, setSummary] = useState(draft.summary || "");
  const [includeAnnotations, setIncludeAnnotations] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = summary.trim();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <form
        role="dialog"
        aria-label="Submit suggestion"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!trimmed) return setError("Please describe your changes.");
          setBusy(true);
          setError(null);
          try {
            await submitSuggestion(draft.id, trimmed, includeAnnotations);
            onSubmitted();
          } catch (err) {
            setError(errorMessage(err, "Submitting failed."));
            setBusy(false);
          }
        }}
        className="w-full max-w-md rounded-2xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] p-5 space-y-4 shadow-2xl"
      >
        <h2 className="text-sm font-semibold">Submit your suggestion for review</h2>
        <div>
          <label htmlFor="sugg-summary" className="block text-xs font-medium text-[#757069] mb-1.5">
            What did you change? <span className="text-red-600">*</span>
          </label>
          <textarea
            id="sugg-summary"
            value={summary}
            maxLength={SUMMARY_MAX}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="e.g. Added a case study about a school app and fixed two typos"
            className="w-full text-sm p-3 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] outline-none focus:border-[#2563EB]"
          />
          <div className="text-right text-[11px] text-[#757069]">{summary.length}/{SUMMARY_MAX}</div>
        </div>
        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={includeAnnotations} onChange={(e) => setIncludeAnnotations(e.target.checked)} className="mt-0.5" />
          <span>
            Include my annotations on this note
            <span className="block text-[#757069]">The reviewer sees a copy of your drawings and text boxes. Otherwise they stay private.</span>
          </span>
        </label>
        {error && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] text-xs cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !trimmed}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Submit
          </button>
        </div>
      </form>
    </div>
  );
}
