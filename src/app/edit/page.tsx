"use client";

import React, { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { notesService } from "@/lib/data/notes-service";
import { extractErrorMessage } from "@/lib/utils";
import { useAuth, AuthProvider } from "@/lib/auth/auth-context";
import { checkCourseEditAccess, isSuperAdmin as checkIsSuperAdmin } from "@/lib/auth/roles";
import { HtmlNoteEditor } from "@/components/editor/html-note-editor";
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
  FileEdit,
  ShieldCheck,
  Crown,
  Upload,
  CheckCircle2,
  FileText,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function EditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note");

  const { user, profile, isLoading: authLoading } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [courseRole, setCourseRole] = useState<CourseRole>("viewer");
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [html, setHtml] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [editorViewMode, setEditorViewMode] = useState<"editor" | "split" | "preview">("split");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const editPdfInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuper = useMemo(() => {
    return checkIsSuperAdmin(user) || profile?.role === "super_admin";
  }, [user, profile]);

  // Load Note and Verify Authorization
  useEffect(() => {
    async function initEditor() {
      if (authLoading) return;

      if (!user) {
        alert("Please sign in with an authorized editor account to access the editor.");
        router.replace("/");
        return;
      }

      if (!noteId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { note: n, currentRevision: rev } = await notesService.getNote(noteId);
        setNote(n);
        setNoteTitle(n.title);
        setPdfUrl(n.pdf_url || null);
        setPdfName(n.pdf_name || null);

        // Check Course-Level Authorization
        const authorized = await checkCourseEditAccess(n.course_id, user);
        setIsAuthorized(authorized);

        if (!authorized) {
          alert("You do not have permission to edit notes in this course.");
          router.replace(`/notes?course=${n.course_id}`);
          return;
        }

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

    initEditor();
  }, [noteId, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note || !user || !isAuthorized) return;

    setIsSubmitting(true);
    setError(null);

    const changeSummary = summary.trim() || "Live update from editor";

    try {
      const blocks = htmlToBlocks(html);

      // Update attached PDF if a new file was chosen or removed
      let finalPdfUrl = pdfUrl;
      let finalPdfName = pdfName;
      if (pdfFile) {
        finalPdfUrl = await notesService.uploadPdf(pdfFile, note.course_id, note.id);
        finalPdfName = pdfFile.name;
      }

      if (finalPdfUrl) {
        const withoutMeta = blocks.filter((b) => b.id !== "b_pdf_meta");
        blocks.splice(0, blocks.length, {
          id: "b_pdf_meta",
          type: "html",
          content: "",
          props: {
            pdf_url: finalPdfUrl,
            pdf_name: finalPdfName,
          },
        }, ...withoutMeta);
      }

      await notesService.updateNote(note.id, {
        title: noteTitle.trim() || note.title,
        pdf_url: finalPdfUrl,
        pdf_name: finalPdfName,
      });

      // Direct Live Publishing
      await notesService.saveNoteDirect({
        noteId: note.id,
        title: noteTitle.trim() || note.title,
        blocks,
        changeSummary,
      });

      alert("Note updated and published live successfully!");
      router.push(`/notes?course=${note.course_id}&note=${note.id}`);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F2EB] dark:bg-[#181716] text-[#757069]">
        <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
        <span className="text-sm font-medium">Loading authorized note editor...</span>
      </div>
    );
  }

  if (!noteId || !note || isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] p-8 text-center flex flex-col items-center justify-center">
        <h2 className="text-lg font-bold mb-2">Access Denied or Note Not Found</h2>
        <p className="text-xs text-[#757069] mb-4">You do not have permission to edit this note, or the note does not exist.</p>
        <Link
          href={note?.course_id ? `/notes?course=${note.course_id}` : "/"}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#A85D44] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Curriculum</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] transition-colors">
      {/* Top Bar */}
      <header className="border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/studio`}
              className="p-1.5 rounded-lg hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#757069] dark:text-[#948F86] transition-colors"
              title="Return to Creator Studio"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
                {isSuper ? (
                  <span className="text-purple-600 dark:text-purple-400 inline-flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Super Admin — Direct Publishing
                  </span>
                ) : (
                  <span className="text-[#5D7063] dark:text-[#768D7D] inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Course Editor — Direct Publishing
                  </span>
                )}
              </div>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note Title"
                className="text-sm font-semibold text-[#2D2926] dark:text-[#E3DFD7] bg-transparent border-none outline-none focus:underline w-full max-w-xs sm:max-w-md"
              />
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
            <strong>Pure HTML Authoring:</strong> Write raw HTML with full styling control. Use the top snippet toolbar to quickly insert standard headings, math formulas, tables, callouts, and workbook components.
          </div>
        </div>

        {/* Dynamic View Modes: Editor | Split | Reader Preview */}
        {editorViewMode === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <HtmlNoteEditor value={html} onChange={setHtml} />
            <LivePreview html={html} noteTitle={noteTitle || note.title} />
          </div>
        )}

        {editorViewMode === "editor" && (
          <div className="max-w-4xl mx-auto">
            <HtmlNoteEditor value={html} onChange={setHtml} />
          </div>
        )}

        {editorViewMode === "preview" && (
          <div className="max-w-4xl mx-auto">
            <LivePreview html={html} noteTitle={noteTitle || note.title} />
          </div>
        )}

        {/* Change Summary & Direct Live Publish */}
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] shadow-sm space-y-4">
          <h2 className="text-sm font-semibold tracking-wide text-[#2D2926] dark:text-[#E3DFD7]">
            Publish Changes Directly to Live Note
          </h2>

          {/* PDF Slide Deck Attachment */}
          <div>
            <label className="block text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-1.5 uppercase tracking-wider">
              Attached Lecture Slides / PDF
            </label>
            <input
              ref={editPdfInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPdfFile(f);
                  setPdfName(f.name);
                }
              }}
              className="hidden"
            />
            {pdfName || pdfFile ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-[#2D2926] dark:text-[#E3DFD7]">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium truncate">{pdfName || pdfFile?.name}</span>
                  {pdfFile && (
                    <span className="text-stone-400 font-mono text-[11px] shrink-0">
                      ({(pdfFile.size / (1024 * 1024)).toFixed(1)} MB - New)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editPdfInputRef.current?.click()}
                    className="text-xs text-[#A85D44] hover:underline"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfFile(null);
                      setPdfUrl(null);
                      setPdfName(null);
                    }}
                    className="text-stone-400 hover:text-red-500"
                    title="Remove PDF"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => editPdfInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#E8E3D9] dark:border-[#33312E] hover:border-[#A85D44] dark:hover:border-[#C4785E] rounded-xl cursor-pointer bg-white/50 dark:bg-[#181716]/50 transition-colors"
              >
                <Upload className="w-5 h-5 text-[#A85D44] dark:text-[#C4785E] mb-1.5" />
                <span className="text-xs font-medium text-[#2D2926] dark:text-[#E3DFD7]">
                  Attach PDF Slide Deck
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5">
                  Click or drag and drop lecture notes (.pdf)
                </span>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="summary" className="block text-xs font-medium text-[#757069] dark:text-[#948F86] mb-1.5">
              Change Log Note (optional)
            </label>
            <input
              id="summary"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Added derivation of gradient descent and corrected syntax in code blocks"
              className="w-full text-xs sm:text-sm p-3 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] outline-none focus:border-[#A85D44]"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-xs text-[#757069] dark:text-[#948F86]">
              ⚡ All updates are saved and published live immediately without peer review queues.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? (
                <span>Publishing...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish Note to Live</span>
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
