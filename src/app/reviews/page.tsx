"use client";

import React, { useState, useEffect, useCallback } from "react";
import { notesService, type PendingRevisionItem } from "@/lib/data/notes-service";
import { useAuth, AuthProvider } from "@/lib/auth/auth-context";
import { BlockDiffViewer } from "@/components/diff/block-diff-viewer";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { BookOpen, FileText } from "lucide-react";
import type { Revision } from "@/lib/supabase/types";
import { 
  GitPullRequest, 
  CheckCircle2, 
  ArrowLeft,
  ShieldCheck,
  Loader2,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { formatDate, extractErrorMessage } from "@/lib/utils";

function ReviewsContent() {
  const { profile, isSuperAdmin, isCoreTeam } = useAuth();
  const canReview = isSuperAdmin || isCoreTeam;
  const [revisions, setRevisions] = useState<PendingRevisionItem[]>([]);
  const [selectedRevId, setSelectedRevId] = useState<string | null>(null);
  const [baseRev, setBaseRev] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadRevisions = useCallback(async () => {
    try {
      setLoading(true);
      const list = await notesService.getPendingRevisions();
      setRevisions(list);
      if (list.length > 0) {
        setSelectedRevId(list[0].id);
      } else {
        setSelectedRevId(null);
      }
    } catch (err) {
      console.error("Error loading pending revisions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  const selectedRev = revisions.find((r) => r.id === selectedRevId);

  // Load base revision for diff view
  useEffect(() => {
    async function loadBase() {
      if (!selectedRev?.base_revision_id) {
        setBaseRev(null);
        return;
      }
      try {
        const { currentRevision } = await notesService.getNote(selectedRev.note_id);
        setBaseRev(currentRevision);
      } catch {
        setBaseRev(null);
      }
    }

    if (selectedRev) {
      loadBase();
    }
  }, [selectedRev]);

  const handleApprove = async () => {
    if (!selectedRev) return;
    try {
      setActionLoading(true);
      await notesService.approveRevision(
        selectedRev.id,
        selectedRev.note_id,
        "Verified and merged by Core Team."
      );
      setStatusMessage("Revision approved! Live note active pointer atomically updated.");
      await loadRevisions();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRev) return;
    const reason = prompt(
      "Enter feedback notes for the contributor:",
      "Content requires citations or mathematical revision."
    );
    if (!reason) return;

    try {
      setActionLoading(true);
      await notesService.rejectRevision(selectedRev.id, reason);
      setStatusMessage("Revision marked as rejected with feedback recorded.");
      await loadRevisions();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] transition-colors">
      {/* Navigation Header */}
      <header className="border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#757069] dark:text-[#948F86] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A85D44] animate-pulse" />
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#2D2926] dark:text-[#E3DFD7]">
                Vi-Lekh Review Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[#757069]" />
              <span>Notes Reader</span>
            </Link>

            <Link
              href="/courses"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span>Courses</span>
            </Link>

            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Review Dashboard Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {statusMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#EBF5F0] dark:bg-[#1C2C24] border border-[#C6E2D2] dark:border-[#2D5A43] text-[#2D5A43] dark:text-[#86BBA0] text-sm flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-[#2D5A43]" />
            {statusMessage}
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-xs text-[#757069]">
            <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mx-auto mb-2" />
            Loading review queue from database...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Revision Queue */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E3D9] dark:border-[#33312E]">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-[#A85D44]" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#757069] dark:text-[#948F86]">
                    Pending Reviews ({revisions.length})
                  </h2>
                </div>
              </div>

              <div className="space-y-2.5">
                {revisions.map((rev) => (
                  <button
                    key={rev.id}
                    type="button"
                    onClick={() => setSelectedRevId(rev.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedRevId === rev.id
                        ? "border-[#A85D44] bg-[#FAF8F5] dark:bg-[#21201E] shadow-sm"
                        : "border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/60 dark:bg-[#21201E]/60 hover:bg-[#FAF8F5] dark:hover:bg-[#21201E]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-[#757069] dark:text-[#948F86] mb-1.5">
                      <span className="font-medium text-[#2D2926] dark:text-[#E3DFD7]">
                        {rev.author?.display_name || "Community Contributor"}
                      </span>
                      <span suppressHydrationWarning>{formatDate(rev.created_at)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#2D2926] dark:text-[#E3DFD7] line-clamp-1 mb-1">
                      {rev.change_summary}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#757069]">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#FAF4EC] dark:bg-[#22201D] text-[#7A5A38] dark:text-[#DDB88C] font-medium border border-[#EAD9C2] dark:border-[#7A5A38]/30">
                        Status: {rev.status}
                      </span>
                      <span>•</span>
                      <span>Target: {rev.note?.title || "Note"}</span>
                    </div>
                  </button>
                ))}

                {revisions.length === 0 && (
                  <div className="p-8 text-center rounded-xl border border-dashed border-[#E8E3D9] dark:border-[#33312E] text-[#757069] text-sm">
                    <CheckCircle2 className="w-8 h-8 text-[#5D7063] mx-auto mb-2" />
                    All caught up! No pending review requests in database.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Diff Comparison & Verdict Actions */}
            <div className="lg:col-span-8">
              {selectedRev ? (
                <div className="space-y-6">
                  {/* Review Action Controls */}
                  <div className="p-5 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] flex flex-wrap items-center justify-between gap-4 shadow-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E] font-bold block mb-0.5">
                        Peer Review Decision
                      </span>
                      <h2 className="text-sm font-semibold text-[#2D2926] dark:text-[#E3DFD7]">
                        {selectedRev.change_summary}
                      </h2>
                    </div>

                    {canReview ? (
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleReject}
                          className="px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Request Changes
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleApprove}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5D7063] hover:bg-[#4C5E52] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Merge</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#757069] dark:text-[#948F86] italic">
                        🔒 Review approval requires Super Admin or Course Editor access.
                      </span>
                    )}
                  </div>

                  {/* Visual Diff Component */}
                  <BlockDiffViewer
                    baseBlocks={baseRev?.blocks || []}
                    proposedBlocks={selectedRev.blocks}
                  />
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl border border-dashed border-[#E8E3D9] dark:border-[#33312E] text-xs text-[#757069]">
                  Select a pending revision from the list on the left to inspect differences.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <AuthProvider>
      <ReviewsContent />
    </AuthProvider>
  );
}
