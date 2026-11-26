"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { notesService } from "@/lib/data/notes-service";
import { useAuth, AuthProvider } from "@/lib/auth/auth-context";
import { isSuperAdmin as checkIsSuperAdmin, checkStudioAccess } from "@/lib/auth/roles";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { CreateCourseModal } from "@/components/modals/create-course-modal";
import { EditCourseModal } from "@/components/modals/edit-course-modal";
import { CreateModuleModal } from "@/components/modals/create-module-modal";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { CourseAccessModal } from "@/components/modals/course-access-modal";
import { MoveNoteModal } from "@/components/modals/move-note-modal";
import { extractErrorMessage } from "@/lib/utils";
import type { Course, CourseWithStats, Module, Note } from "@/lib/supabase/types";
import { 
  BookOpen, 
  Plus, 
  Layers, 
  FileText, 
  Users, 
  ArrowRight, 
  Pencil, 
  Trash2, 
  Crown, 
  ShieldCheck, 
  ExternalLink, 
  Loader2, 
  Search, 
  Check, 
  X,
  Sparkles,
  LayoutDashboard,
  FolderPlus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FolderInput
} from "lucide-react";
import Link from "next/link";
import { getReviewQueue } from "@/lib/data/suggestions";
import { useRouter } from "next/navigation";

function StudioContent() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithStats | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [loading, setLoading] = useState(true);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [targetModuleIdForNote, setTargetModuleIdForNote] = useState<string | undefined>(undefined);

  // Moving note & reordering state
  const [movingNote, setMovingNote] = useState<Note | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);

  // Inline editing state
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");

  const isSuper = useMemo(() => {
    return checkIsSuperAdmin(user) || profile?.role === "super_admin";
  }, [user, profile]);

  // 1. Authorization Gate
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    checkStudioAccess(user).then((allowed) => {
      setHasAccess(allowed);
      if (!allowed) {
        alert("You do not have permission to access the Creator Studio.");
        router.replace("/");
      }
    });
  }, [user, authLoading, router]);

  // 2. Load Editable Courses
  const loadStudioCourses = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const editable = await notesService.getUserEditableCourses(user.uid);
      setCourses(editable);

      if (editable.length > 0) {
        setSelectedCourse((prev) => {
          if (prev) {
            const found = editable.find((c) => c.id === prev.id);
            return found || editable[0];
          }
          return editable[0];
        });
      } else {
        setSelectedCourse(null);
      }
    } catch (err) {
      console.error("Error loading studio courses:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      loadStudioCourses();
    }
  }, [hasAccess, loadStudioCourses]);

  // 3. Load Syllabus (Modules & Notes) for Selected Course
  const loadSyllabus = useCallback(async (courseId: string) => {
    try {
      setSyllabusLoading(true);
      const { modules: m, notes: n } = await notesService.getCourseWithModulesAndNotes(courseId);
      setModules(m);
      setNotes(n);
    } catch (err) {
      console.error("Error loading course syllabus:", err);
    } finally {
      setSyllabusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadSyllabus(selectedCourse.id);
    } else {
      setModules([]);
      setNotes([]);
    }
  }, [selectedCourse, loadSyllabus]);

  // Handlers
  const handleCourseCreated = (newCourse: Course) => {
    loadStudioCourses();
    setIsCreateCourseOpen(false);
  };

  const handleCourseUpdated = (updated: Course) => {
    setSelectedCourse((prev) => (prev ? { ...prev, ...updated } : null));
    setCourses((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!isSuper) {
      alert("Only the Super Admin can delete courses.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete course "${course.title}"?\n\nThis will remove all associated modules, notes, and revisions.`
      )
    ) {
      return;
    }

    try {
      await notesService.deleteCourse(course.id);
      loadStudioCourses();
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleUpdateModule = async (mod: Module, newTitle: string) => {
    try {
      const updated = await notesService.updateModule(mod.id, { title: newTitle });
      setModules((prev) => prev.map((m) => (m.id === mod.id ? updated : m)));
      setEditingModuleId(null);
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleDeleteModule = async (mod: Module) => {
    if (
      !confirm(
        `Are you sure you want to delete module "${mod.title}"?\n\nNotes belonging to this module will become unassigned.`
      )
    ) {
      return;
    }

    try {
      await notesService.deleteModule(mod.id);
      setModules((prev) => prev.filter((m) => m.id !== mod.id));
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleUpdateNote = async (note: Note, newTitle: string) => {
    try {
      const updated = await notesService.updateNote(note.id, { title: newTitle });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
      setEditingNoteId(null);
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleDeleteNote = async (note: Note) => {
    if (!confirm(`Are you sure you want to delete note "${note.title}"?`)) {
      return;
    }

    try {
      await notesService.deleteNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const handleMoveNoteStep = async (note: Note, direction: "up" | "down") => {
    if (!selectedCourse) return;
    const currentList = notes
      .filter((n) => (n.module_id || null) === (note.module_id || null))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const index = currentList.findIndex((n) => n.id === note.id);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const newCurrentList = [...currentList];
    const [moved] = newCurrentList.splice(index, 1);
    newCurrentList.splice(targetIndex, 0, moved);

    const updates = newCurrentList.map((n, idx) => ({
      id: n.id,
      order_index: idx,
      module_id: n.module_id || null,
    }));

    // Optimistic UI update
    setNotes((prev) =>
      prev.map((n) => {
        const match = updates.find((u) => u.id === n.id);
        return match ? { ...n, order_index: match.order_index } : n;
      })
    );

    // Persist to Supabase
    try {
      await notesService.reorderNotes(selectedCourse.id, updates);
    } catch (err) {
      console.error("Failed to persist note reordering:", err);
      if (selectedCourse) loadSyllabus(selectedCourse.id);
      alert("Failed to save note order: " + extractErrorMessage(err));
    }
  };

  const handleDropOnNote = async (e: React.DragEvent, targetNote: Note) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedNoteId;
    setDraggedNoteId(null);
    setDragOverNoteId(null);

    if (!sourceId || sourceId === targetNote.id || !selectedCourse) return;

    const currentList = notes
      .filter((n) => (n.module_id || null) === (targetNote.module_id || null))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const sourceIndex = currentList.findIndex((n) => n.id === sourceId);
    const targetIndex = currentList.findIndex((n) => n.id === targetNote.id);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const updatedList = [...currentList];
    const [removed] = updatedList.splice(sourceIndex, 1);
    updatedList.splice(targetIndex, 0, removed);

    const updates = updatedList.map((n, idx) => ({
      id: n.id,
      order_index: idx,
      module_id: n.module_id || null,
    }));

    setNotes((prev) =>
      prev.map((n) => {
        const match = updates.find((u) => u.id === n.id);
        return match ? { ...n, order_index: match.order_index } : n;
      })
    );

    try {
      await notesService.reorderNotes(selectedCourse.id, updates);
    } catch (err) {
      console.error("Failed to persist dragged note order:", err);
      if (selectedCourse) loadSyllabus(selectedCourse.id);
      alert("Failed to save note order: " + extractErrorMessage(err));
    }
  };

  const handleConfirmMoveNote = async (note: Note, targetModId: string | null) => {
    if (!selectedCourse) return;
    const currentModId = note.module_id || null;
    if (targetModId === currentModId) return;

    const destNotes = notes.filter((n) => (n.module_id || null) === targetModId);
    const maxOrder = destNotes.reduce((max, n) => Math.max(max, n.order_index ?? 0), -1);
    const nextOrderIndex = maxOrder + 1;

    try {
      await notesService.updateNoteModule(note.id, targetModId, nextOrderIndex);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id
            ? { ...n, module_id: targetModId ?? undefined, order_index: nextOrderIndex }
            : n
        )
      );
    } catch (err) {
      console.error("Failed to move note module:", err);
      if (selectedCourse) loadSyllabus(selectedCourse.id);
      alert("Failed to move note: " + extractErrorMessage(err));
      throw err;
    }
  };

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase().trim();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.domain || "").toLowerCase().includes(q) ||
        (c.slug || "").toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  if (authLoading || hasAccess === null) {
    return (
      <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] flex items-center justify-center p-12 text-[#757069]">
        <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
        <span className="text-sm font-medium">Verifying studio authorization...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] flex flex-col font-sans transition-colors">
      {/* Studio Header */}
      <header className="h-16 border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-50 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A85D44] text-white flex items-center justify-center font-bold text-base shadow-sm">
                वि
              </div>
              <span className="font-semibold text-lg tracking-tight text-[#2D2926] dark:text-[#E3DFD7]">
                Vi-Lekh
              </span>
            </Link>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#A85D44]/10 text-[#A85D44] dark:text-[#C4785E] text-xs font-semibold">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Creator Studio</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ReviewsLink />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#A85D44]" />
              <span>Public Catalog</span>
            </Link>
            <div className="flex items-center gap-2 pl-2 border-l border-[#E8E3D9] dark:border-[#33312E]">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row">
        {/* Left Sidebar: Course Selection */}
        <aside className="w-full md:w-80 shrink-0 border-r border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/60 dark:bg-[#21201E]/60 flex flex-col min-h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-[#E8E3D9] dark:border-[#33312E] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#2D2926] dark:text-[#E3DFD7]">
                  {isSuper ? "All Courses" : "Assigned Courses"}
                </h2>
                <span className="text-[11px] text-[#757069] dark:text-[#948F86]">
                  {isSuper ? "Super Admin Access" : "Authorized Course Editor"}
                </span>
              </div>
              {/* Only Super Admin can create courses */}
              {isSuper && (
                <button
                  type="button"
                  onClick={() => setIsCreateCourseOpen(true)}
                  title="Create a new course"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Course</span>
                </button>
              )}
            </div>

            {/* Course Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#757069]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter courses..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-[#2D2926] dark:text-[#E3DFD7] placeholder:text-[#757069] outline-none focus:border-[#A85D44]"
              />
            </div>
          </div>

          {/* Courses List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#757069]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A85D44]" />
                Loading courses...
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="py-8 text-center px-4 text-xs text-[#757069]">
                <BookOpen className="w-8 h-8 text-[#A85D44] mx-auto mb-2" />
                <p className="font-semibold mb-1">No courses found</p>
                <p className="text-[11px]">
                  {isSuper
                    ? "Click 'New Course' above to create the first curriculum."
                    : "You have not been assigned editor permissions for any course yet."}
                </p>
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = selectedCourse?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCourse(c)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isSelected
                        ? "bg-[#FAF8F5] dark:bg-[#21201E] border-[#A85D44]/40 shadow-xs"
                        : "border-transparent hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#757069] dark:text-[#948F86]">
                        {c.domain || "General"}
                      </span>
                      {isSuper ? (
                        <Crown className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <ShieldCheck className="w-3 h-3 text-[#5D7063]" />
                      )}
                    </div>
                    <h3 className={`text-xs font-bold line-clamp-1 ${isSelected ? "text-[#A85D44] dark:text-[#C4785E]" : "text-[#2D2926] dark:text-[#E3DFD7]"}`}>
                      {c.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#757069] dark:text-[#948F86]">
                      <span>{c.moduleCount} modules</span>
                      <span>•</span>
                      <span>{c.noteCount} notes</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Panel: Selected Course Details & Syllabus Manager */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {selectedCourse ? (
            <>
              {/* Course Header Banner */}
              <div className="p-6 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#757069] dark:text-[#948F86] font-medium">
                      {selectedCourse.domain || "Academic Curriculum"}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#2D2926] dark:text-[#E3DFD7] mt-1.5">
                      {selectedCourse.title}
                    </h1>
                    <p className="text-xs text-[#757069] dark:text-[#948F86] mt-1 max-w-2xl">
                      {selectedCourse.description || "Course syllabus and technical notes."}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditCourseOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] dark:hover:bg-[#2C2A28] text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] transition-colors"
                      title="Edit Course Details"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#A85D44]" />
                      <span>Edit Course</span>
                    </button>

                    <Link
                      href={`/notes?course=${selectedCourse.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#A85D44]" />
                      <span>Open in Reader</span>
                    </Link>

                    {/* Super Admin Collaborator Management */}
                    {isSuper && (
                      <button
                        type="button"
                        onClick={() => setIsAccessModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#A85D44]/30 bg-[#A85D44]/10 hover:bg-[#A85D44]/20 text-xs font-semibold text-[#A85D44] dark:text-[#C4785E] transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Manage Editors</span>
                      </button>
                    )}

                    {/* Super Admin Course Deletion */}
                    {isSuper && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(selectedCourse)}
                        title="Delete Course"
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-bar: Add module or note quick buttons */}
                <div className="pt-4 border-t border-[#E8E3D9]/60 dark:border-[#33312E]/60 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModuleOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFEBE3] dark:bg-[#292825] hover:bg-[#A85D44] hover:text-white text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] transition-all"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add Module</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetModuleIdForNote(undefined);
                      setIsCreateNoteOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Note</span>
                  </button>
                </div>
              </div>

              {/* Syllabus Structure & Note Editor Launcher */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#757069] dark:text-[#948F86]">
                    Curriculum Syllabus ({modules.length} Modules, {notes.length} Notes)
                  </h2>
                </div>

                {syllabusLoading ? (
                  <div className="py-16 text-center text-xs text-[#757069]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A85D44]" />
                    Loading curriculum structure...
                  </div>
                ) : modules.length === 0 && notes.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl border border-dashed border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/40 dark:bg-[#21201E]/40">
                    <Layers className="w-8 h-8 text-[#A85D44] mx-auto mb-2" />
                    <h3 className="text-sm font-bold mb-1">No Modules or Notes Yet</h3>
                    <p className="text-xs text-[#757069] dark:text-[#948F86] mb-4">
                      Start building the syllabus by adding a module or a note.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateModuleOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EFEBE3] text-xs font-semibold hover:bg-[#A85D44] hover:text-white transition-colors"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Add Module</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreateNoteOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#A85D44] text-white text-xs font-semibold hover:bg-[#8F4C35] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Render each module */}
                    {modules.map((mod) => {
                      const moduleNotes = notes
                        .filter((n) => n.module_id === mod.id)
                        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                      const isEditing = editingModuleId === mod.id;

                      return (
                        <div
                          key={mod.id}
                          className="rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] p-4 sm:p-5 shadow-xs space-y-3"
                        >
                          {/* Module Header */}
                          <div className="flex items-center justify-between gap-3">
                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingModuleTitle}
                                  onChange={(e) => setEditingModuleTitle(e.target.value)}
                                  className="flex-1 text-xs px-2.5 py-1 rounded-lg border border-[#A85D44] bg-white dark:bg-[#181716] font-semibold text-[#2D2926] dark:text-[#E3DFD7]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateModule(mod, editingModuleTitle.trim())}
                                  className="p-1.5 rounded-lg bg-[#A85D44] text-white hover:bg-[#8F4C35]"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingModuleId(null)}
                                  className="p-1.5 rounded-lg border border-[#E8E3D9] text-[#757069]"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Layers className="w-4 h-4 text-[#A85D44] shrink-0" />
                                <h3 className="text-sm font-bold text-[#2D2926] dark:text-[#E3DFD7] truncate">
                                  {mod.title}
                                </h3>
                                <span className="text-[10px] text-[#757069] shrink-0">
                                  ({moduleNotes.length} {moduleNotes.length === 1 ? "note" : "notes"})
                                </span>
                              </div>
                            )}

                            {!isEditing && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTargetModuleIdForNote(mod.id);
                                    setIsCreateNoteOpen(true);
                                  }}
                                  title="Add Note to this Module"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[#A85D44] hover:bg-[#A85D44]/10 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Note</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingModuleId(mod.id);
                                    setEditingModuleTitle(mod.title);
                                  }}
                                  title="Rename Module"
                                  className="p-1.5 rounded-lg text-[#757069] hover:text-[#A85D44] hover:bg-[#EFEBE3] transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteModule(mod)}
                                  title="Delete Module"
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Notes inside Module */}
                          {moduleNotes.length === 0 ? (
                            <p className="text-[11px] text-[#757069] italic pl-6">
                              No notes in this module. Click &quot;+ Note&quot; to add one.
                            </p>
                          ) : (
                            <div className="space-y-1.5 pl-6 border-l-2 border-[#E8E3D9] dark:border-[#33312E] ml-2">
                              {moduleNotes.map((note, noteIdx) => {
                                const isEditingNote = editingNoteId === note.id;

                                return (
                                  <div
                                    key={note.id}
                                    draggable={!isEditingNote}
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData("text/plain", note.id);
                                      setDraggedNoteId(note.id);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedNoteId(null);
                                      setDragOverNoteId(null);
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      if (draggedNoteId && draggedNoteId !== note.id) {
                                        setDragOverNoteId(note.id);
                                      }
                                    }}
                                    onDragLeave={() => {
                                      if (dragOverNoteId === note.id) {
                                        setDragOverNoteId(null);
                                      }
                                    }}
                                    onDrop={(e) => handleDropOnNote(e, note)}
                                    onDoubleClick={(e) => {
                                      const target = e.target as HTMLElement;
                                      if (
                                        target.tagName.toLowerCase() === "input" ||
                                        target.closest("button") ||
                                        target.closest("a")
                                      ) {
                                        return;
                                      }
                                      setMovingNote(note);
                                    }}
                                    className={`flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1B19] border transition-all text-xs group cursor-default ${
                                      dragOverNoteId === note.id
                                        ? "border-t-2 border-t-[#A85D44] border-[#A85D44]/50 bg-[#A85D44]/5 dark:bg-[#A85D44]/10"
                                        : "border-[#E8E3D9]/60 dark:border-[#33312E]/60 hover:border-[#A85D44]/30"
                                    } ${draggedNoteId === note.id ? "opacity-40" : ""}`}
                                  >
                                    {isEditingNote ? (
                                      <div className="flex items-center gap-2 flex-1 mr-2">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={editingNoteTitle}
                                          onChange={(e) => setEditingNoteTitle(e.target.value)}
                                          className="flex-1 text-xs px-2 py-0.5 rounded border border-[#A85D44] bg-white dark:bg-[#181716]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateNote(note, editingNoteTitle.trim())}
                                          className="p-1 rounded bg-[#A85D44] text-white"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingNoteId(null)}
                                          className="p-1 rounded text-[#757069]"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 min-w-0 mr-2 flex-1">
                                        {/* Drag handle */}
                                        <div
                                          title="Drag to reorder note"
                                          className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-[#757069]/60 hover:text-[#2D2926] dark:hover:text-[#E3DFD7] hover:bg-[#E8E3D9]/50 dark:hover:bg-[#33312E]/50 shrink-0"
                                        >
                                          <GripVertical className="w-3.5 h-3.5" />
                                        </div>

                                        {/* Up / Down Reorder Buttons */}
                                        <div className="flex flex-col shrink-0 -space-y-0.5">
                                          <button
                                            type="button"
                                            disabled={noteIdx === 0}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMoveNoteStep(note, "up");
                                            }}
                                            title="Move Up"
                                            className="p-0.5 rounded hover:bg-[#E8E3D9]/60 dark:hover:bg-[#33312E]/60 text-[#757069] hover:text-[#A85D44] disabled:opacity-20 disabled:hover:text-[#757069] disabled:hover:bg-transparent transition-colors"
                                          >
                                            <ChevronUp className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={noteIdx === moduleNotes.length - 1}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMoveNoteStep(note, "down");
                                            }}
                                            title="Move Down"
                                            className="p-0.5 rounded hover:bg-[#E8E3D9]/60 dark:hover:bg-[#33312E]/60 text-[#757069] hover:text-[#A85D44] disabled:opacity-20 disabled:hover:text-[#757069] disabled:hover:bg-transparent transition-colors"
                                          >
                                            <ChevronDown className="w-3 h-3" />
                                          </button>
                                        </div>

                                        <FileText className="w-3.5 h-3.5 text-[#A85D44] shrink-0 ml-0.5" />
                                        <span 
                                          className="font-medium text-[#2D2926] dark:text-[#E3DFD7] truncate select-none"
                                          title="Double-click to change module"
                                        >
                                          {note.title}
                                        </span>
                                      </div>
                                    )}

                                    {!isEditingNote && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        {/* Direct Note Editor Button */}
                                        <Link
                                          href={`/edit?note=${note.id}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] text-white text-[11px] font-semibold transition-colors"
                                        >
                                          <Pencil className="w-3 h-3" />
                                          <span>Edit Content</span>
                                        </Link>

                                        {/* View in Reader */}
                                        <Link
                                          href={`/notes?course=${selectedCourse.id}&note=${note.id}`}
                                          target="_blank"
                                          title="View in Reader"
                                          className="p-1.5 rounded-lg text-[#757069] hover:text-[#2D2926] hover:bg-[#EFEBE3] dark:hover:bg-[#2C2A28] transition-colors"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>

                                        {/* Move to another module */}
                                        <button
                                          type="button"
                                          onClick={() => setMovingNote(note)}
                                          title="Change module (or double-click row)"
                                          className="p-1.5 rounded-lg text-[#757069] hover:text-[#A85D44] hover:bg-[#EFEBE3] dark:hover:bg-[#2C2A28] transition-colors"
                                        >
                                          <FolderInput className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Rename Note */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingNoteId(note.id);
                                            setEditingNoteTitle(note.title);
                                          }}
                                          title="Rename Note"
                                          className="p-1.5 rounded-lg text-[#757069] hover:text-[#A85D44] hover:bg-[#EFEBE3] dark:hover:bg-[#2C2A28] transition-colors"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Delete Note */}
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteNote(note)}
                                          title="Delete Note"
                                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Unassigned notes (if any) */}
                    {(() => {
                      const unassignedNotes = notes
                        .filter((n) => !n.module_id)
                        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                      if (unassignedNotes.length === 0) return null;

                      return (
                        <div className="rounded-2xl border border-dashed border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/50 dark:bg-[#21201E]/50 p-4 sm:p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-[#757069] uppercase tracking-wider">
                              Unassigned Notes ({unassignedNotes.length})
                            </h3>
                            <span className="text-[11px] text-[#757069] italic">
                              Tip: Double-click or click &quot;Assign to Module&quot; to place notes into syllabus modules.
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {unassignedNotes.map((note) => (
                              <div
                                key={note.id}
                                onDoubleClick={(e) => {
                                  const target = e.target as HTMLElement;
                                  if (
                                    target.tagName.toLowerCase() === "input" ||
                                    target.closest("button") ||
                                    target.closest("a")
                                  ) {
                                    return;
                                  }
                                  setMovingNote(note);
                                }}
                                className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1B19] border border-[#E8E3D9] dark:border-[#33312E] text-xs hover:border-[#A85D44]/40 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0 mr-2 flex-1">
                                  <FileText className="w-3.5 h-3.5 text-[#757069] shrink-0" />
                                  <span className="font-medium text-[#2D2926] dark:text-[#E3DFD7] truncate select-none">
                                    {note.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setMovingNote(note)}
                                    title="Assign note to a module"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#A85D44]/30 hover:border-[#A85D44] bg-[#A85D44]/10 hover:bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] text-[11px] font-semibold transition-colors"
                                  >
                                    <FolderInput className="w-3 h-3" />
                                    <span>Assign to Module</span>
                                  </button>
                                  <Link
                                    href={`/edit?note=${note.id}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] text-white text-[11px] font-semibold transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>Edit</span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNote(note)}
                                    title="Delete Note"
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-24 text-center max-w-md mx-auto p-8 rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E]">
              <BookOpen className="w-10 h-10 text-[#A85D44] mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#2D2926] dark:text-[#E3DFD7] mb-1">
                No Course Selected
              </h2>
              <p className="text-xs text-[#757069] dark:text-[#948F86] mb-4">
                Select a course from the sidebar to manage its modules and lecture notes.
              </p>
              {isSuper && (
                <button
                  type="button"
                  onClick={() => setIsCreateCourseOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A85D44] text-white text-xs font-semibold hover:bg-[#8F4C35] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Course</span>
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Creation & Management Modals */}
      {isSuper && (
        <CreateCourseModal
          isOpen={isCreateCourseOpen}
          onClose={() => setIsCreateCourseOpen(false)}
          onCourseCreated={handleCourseCreated}
        />
      )}

      {selectedCourse && (
        <EditCourseModal
          isOpen={isEditCourseOpen}
          onClose={() => setIsEditCourseOpen(false)}
          course={selectedCourse}
          onCourseUpdated={handleCourseUpdated}
        />
      )}

      {selectedCourse && (
        <CreateModuleModal
          isOpen={isCreateModuleOpen}
          onClose={() => setIsCreateModuleOpen(false)}
          courseId={selectedCourse.id}
          courseTitle={selectedCourse.title}
          existingCount={modules.length}
          onModuleCreated={(newMod) => setModules((prev) => [...prev, newMod])}
        />
      )}

      {selectedCourse && (
        <CreateNoteModal
          isOpen={isCreateNoteOpen}
          onClose={() => setIsCreateNoteOpen(false)}
          courseId={selectedCourse.id}
          modules={modules}
          defaultModuleId={targetModuleIdForNote}
          onNoteCreated={(newNote) => setNotes((prev) => [...prev, newNote])}
        />
      )}

      {selectedCourse && (
        <MoveNoteModal
          isOpen={movingNote !== null}
          onClose={() => setMovingNote(null)}
          note={movingNote}
          modules={modules}
          onConfirmMove={handleConfirmMoveNote}
        />
      )}

      {selectedCourse && isSuper && (
        <CourseAccessModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          course={selectedCourse}
        />
      )}
    </div>
  );
}

export default function StudioPage() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] flex items-center justify-center p-12 text-[#757069]">
          <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
          <span className="text-sm font-medium">Loading Creator Studio...</span>
        </div>
      }>
        <StudioContent />
      </Suspense>
    </AuthProvider>
  );
}

/** Link to the review queue with the number of pending suggestions (task 10.1). */
function ReviewsLink() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    getReviewQueue()
      .then((list) => !cancelled && setCount(list.length))
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <Link
      href="/review"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors"
    >
      <span>Reviews</span>
      {count !== null && count > 0 && (
        <span className="min-w-[1.25rem] px-1.5 py-px rounded-full bg-[#A85D44] text-white text-[10px] font-bold text-center" aria-label={`${count} pending`}>
          {count}
        </span>
      )}
    </Link>
  );
}
