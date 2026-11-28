"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, GitPullRequestDraft, Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { formatDate } from "@/lib/utils";
import {
  STATUS_LABEL,
  errorMessage,
  getMySuggestions,
  withdrawSuggestion,
  type SuggestionStatus,
  type SuggestionWithContext,
} from "@/lib/data/suggestions";

const STATUS_STYLE: Record<SuggestionStatus, string> = {
  draft: "bg-stone-200/70 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  changes_requested: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  merged: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  forked: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

/** The signed-in user's suggestions with status and feedback (task 9.5). */
function MySuggestions() {
  const { user, isLoading } = useAuth();
  const submitted = useSearchParams().get("submitted");
  const [items, setItems] = useState<SuggestionWithContext[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await getMySuggestions(user.uid));
    } catch (err) {
      setError(errorMessage(err, "Your suggestions could not be loaded."));
    }
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const edit = (s: SuggestionWithContext) => `/edit?note=${s.note_id}&mode=suggest`;

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7]">
      <header className="border-b border-[#E8E3D9] dark:border-[#33312E] h-16 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#757069]" title="Home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-semibold flex items-center gap-1.5">
            <GitPullRequestDraft className="w-4 h-4 text-[#2563EB]" /> My suggestions
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {submitted && (
          <div role="status" className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Your suggestion was submitted. A course editor will review it.
          </div>
        )}
        {error && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{error}</p>}
        {isLoading || (user && items === null) ? (
          <p className="text-xs text-[#757069] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
        ) : !user ? (
          <p className="text-sm">Sign in to see your suggestions.</p>
        ) : items && items.length === 0 ? (
          <p className="text-sm text-[#757069]">
            You haven&apos;t suggested any edits yet. Open a note and choose <strong>Suggest edits</strong>.
          </p>
        ) : (
          <ul className="space-y-3">
            {items?.map((s) => (
              <li key={s.id} className="p-4 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={s.note ? `/notes?course=${s.note.course_id}&note=${s.note_id}` : "#"}
                    className="text-sm font-semibold hover:underline"
                  >
                    {s.note?.title ?? "Deleted note"}
                  </Link>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                </div>
                <p className="mt-1 text-xs text-[#757069]" suppressHydrationWarning>
                  {s.submitted_at ? `Submitted ${formatDate(s.submitted_at)}` : `Last edited ${formatDate(s.updated_at)}`}
                  {s.base?.version_number ? ` · based on v${s.base.version_number}` : ""}
                </p>
                {s.summary && <p className="mt-2 text-sm">{s.summary}</p>}
                {s.reviewer_feedback && (s.status === "rejected" || s.status === "changes_requested") && (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
                    <strong>Reviewer feedback:</strong> <span className="whitespace-pre-wrap">{s.reviewer_feedback}</span>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {(s.status === "draft" || s.status === "changes_requested") && (
                    <Link href={edit(s)} className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white font-semibold">
                      Continue editing
                    </Link>
                  )}
                  {s.status === "pending" && (
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={async () => {
                        setBusy(s.id);
                        setError(null);
                        try {
                          await withdrawSuggestion(s.id);
                          await load();
                        } catch (err) {
                          setError(errorMessage(err, "Withdrawing failed."));
                        } finally {
                          setBusy(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] cursor-pointer disabled:opacity-50"
                    >
                      Withdraw to draft
                    </button>
                  )}
                  {s.status === "forked" && s.forked_note_id && s.note && (
                    <Link href={`/notes?course=${s.note.course_id}&note=${s.forked_note_id}`} className="px-3 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E]">
                      Open the copy
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function SuggestionsPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="p-8 text-center text-xs">Loading…</div>}>
        <MySuggestions />
      </Suspense>
    </AuthProvider>
  );
}
