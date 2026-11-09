"use client";

import React, { useState, useEffect, Suspense } from "react";
import { notesService } from "@/lib/data/notes-service";
import { extractErrorMessage } from "@/lib/utils";
import { useAuth, AuthProvider } from "@/lib/auth/auth-context";
import { RichEditor } from "@/components/editor/rich-editor";
import { LivePreview } from "@/components/editor/live-preview";
import { blocksToHtml, htmlToBlocks } from "@/lib/editor/block-converter";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import type { Note, CourseRole } from "@/lib/supabase/types";
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  Columns2,
  Eye,
  FileEdit
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function EditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note");

  const { user, isSuperAdmin, signInWithGoogle } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [courseRole, setCourseRole] = useState<CourseRole>("contributor");
  const [html, setHtml] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [editorViewMode, setEditorViewMode] = useState<"editor" | "split" | "preview">("split");
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkRole() {
      if (note) {
        const role = await notesService.getUserCourseRole(note.course_id);
        setCourseRole(role);
      }
    }
    checkRole();
  }, [note, user, isSuperAdmin]);

  useEffect(() => {
    async function loadNote() {
      if (!noteId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { note: n, currentRevision: rev } = await notesService.getNote(noteId);
        setNote(n);
        
        // Resolve course-level role
        const role = await notesService.getUserCourseRole(n.course_id);
        setCourseRole(role);

        // Convert existing blocks to rich HTML for TipTap
        const initialHtml = blocksToHtml(
          rev?.blocks && rev.blocks.length > 0
            ? rev.blocks
            : [
                {
                  id: "b_head",
                  type: "heading",
                  content: n.title,
                  props: { level: 1 },
                },
                {
                  id: "b_intro",
                  type: "paragraph",
                  content:
                    "Start writing lecture notes here. Type '/' on an empty line to insert headings, mathematics, callouts, or code blocks.",
                },
              ]
        );
        setHtml(initialHtml);
      } catch (err: unknown) {
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    loadNote();
  }, [noteId]);

  const canDirectPublish = Boolean(isSuperAdmin || courseRole === "admin" || courseRole === "editor");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note || !user) return;

    setIsSubmitting(true);
    setError(null);

    const changeSummary = summary.trim() || "Updated note content";

    try {
      const blocks = htmlToBlocks(html);
      await notesService.submitRevision({
        note_id: note.id,
        base_revision_id: note.current_revision_id || undefined,
        blocks,
        change_summary: changeSummary,
        isDirectPublish: canDirectPublish,
      });

      if (canDirectPublish) {
        alert("Published immediately! The live note has been updated.");
        router.push(`/notes?course=${note.course_id}`);
      } else {
        alert("Revision proposal submitted! Placed in the review queue for course maintainers.");
        router.push("/reviews");
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EB] dark:bg-[#181716] text-[#757069]">
        <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
        <span className="text-sm font-medium">Loading note editor...</span>
      </div>
    );
  }

  if (!noteId || !note) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] p-8 text-center">
        <h2 className="text-lg font-bold mb-2">No note selected for editing</h2>
        <p className="text-xs text-[#757069] mb-4">Please select a note from the syllabus to propose changes.</p>
        <Link
          href={note?.course_id ? `/notes?course=${note.course_id}` : "/notes"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#A85D44] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Notes</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] transition-colors">
      {/* Top Bar */}
      <header className="border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/notes?course=${note.course_id}`}
              className="p-1.5 rounded-lg hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#757069] dark:text-[#948F86] transition-colors"
              title="Return to notes"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E] font-bold block">
                {isSuperAdmin 
                  ? "Super Admin — Direct Edit Mode" 
                  : canDirectPublish 
                  ? "Permanent Editor — Direct Publish Mode" 
                  : !user
                  ? "Sign In to Suggest Edits"
                  : "Contributor — Suggestion / Review Mode"}
              </span>
              <h1 className="text-sm font-semibold truncate max-w-xs sm:max-w-md text-[#2D2926] dark:text-[#E3DFD7]">
                {note.title}
              </h1>
            </div>
          </div>

          {/* View Mode Switcher (Editor / Split / Preview) */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EFEBE3] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E]">
              <button
                type="button"
                onClick={() => setEditorViewMode("editor")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  editorViewMode === "editor"
                    ? "bg-white dark:bg-[#181716] text-[#A85D44] dark:text-[#C4785E] shadow-sm font-semibold"
                    : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorViewMode("split")}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  editorViewMode === "split"
                    ? "bg-white dark:bg-[#181716] text-[#A85D44] dark:text-[#C4785E] shadow-sm font-semibold"
                    : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setEditorViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  editorViewMode === "preview"
                    ? "bg-white dark:bg-[#181716] text-[#A85D44] dark:text-[#C4785E] shadow-sm font-semibold"
                    : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Workspace Canvas */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] text-xs text-[#2D2926] dark:text-[#E3DFD7] flex items-start gap-3 shadow-sm">
          <Sparkles className="w-4 h-4 text-[#A85D44] dark:text-[#C4785E] mt-0.5 shrink-0" />
          <div className="leading-relaxed">
            <strong>Pro Editor:</strong> Highlight any text to reveal the inline formatting menu (Bold, Italic, Link, Highlight, Code). Type <kbd className="rounded border border-[#E8E3D9] dark:border-[#33312E] bg-[#EFEBE3] dark:bg-[#292825] px-1 py-0.5 font-mono text-[11px]">/</kbd> on an empty line for quick insertion of headings, mathematical formulas, callouts, and code blocks.
          </div>
        </div>

        {/* Dynamic View Modes: Editor | Split | Reader Preview */}
        {editorViewMode === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <RichEditor initialHtml={html} onChange={(newHtml) => setHtml(newHtml)} />
            <LivePreview html={html} noteTitle={note.title} />
          </div>
        )}

        {editorViewMode === "editor" && (
          <div className="max-w-4xl mx-auto">
            <RichEditor initialHtml={html} onChange={(newHtml) => setHtml(newHtml)} />
          </div>
        )}

        {editorViewMode === "preview" && (
          <div className="max-w-4xl mx-auto">
            <LivePreview html={html} noteTitle={note.title} />
          </div>
        )}

        {/* Change Summary & Submit Box */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] shadow-sm space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-[#2D2926] dark:text-[#E3DFD7]">
            {canDirectPublish ? "Publish Note Update Directly (Permanent Editor)" : "Propose Revision to Course Maintainers"}
          </h2>
          <div>
            <label htmlFor="summary" className="block text-xs font-medium text-[#757069] dark:text-[#948F86] mb-1.5">
              Change Summary (explain what you changed and why)
            </label>
            <input
              id="summary"
              type="text"
              disabled={!user}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="(Optional) e.g. Added derivation of gradient descent, inserted callouts, and corrected typography"
              className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] outline-none focus:border-[#A85D44] disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {!user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#757069] dark:text-[#948F86]">
                  🔒 Sign in with Google to propose and suggest edits for this note.
                </span>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="px-3 py-1.5 rounded-lg bg-[#A85D44] text-white text-xs font-semibold hover:bg-[#8F4C35] transition-colors"
                >
                  Sign in with Google
                </button>
              </div>
            ) : (
              <span className="text-xs text-[#757069] dark:text-[#948F86]">
                {canDirectPublish 
                  ? "✓ Permanent Editor privilege: edits publish directly to live note." 
                  : "ℹ️ Suggestion mode: your revision will be sent to the review queue for course maintainers."}
              </span>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !user}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] disabled:opacity-50 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{canDirectPublish ? "Publish Update Directly" : "Submit Suggestion for Review"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditPage() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="p-8 text-center text-xs">Loading editor...</div>}>
        <EditContent />
      </Suspense>
    </AuthProvider>
  );
}
