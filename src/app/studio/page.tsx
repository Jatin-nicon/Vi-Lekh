"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { notesService } from "@/lib/data/notes-service";
import { useAuth, AuthProvider } from "@/lib/auth/auth-context";
import { isSuperAdmin as checkIsSuperAdmin, checkStudioAccess } from "@/lib/auth/roles";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { CreateCourseModal } from "@/components/modals/create-course-modal";
import { CreateModuleModal } from "@/components/modals/create-module-modal";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { CourseAccessModal } from "@/components/modals/course-access-modal";
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
  FolderPlus
} from "lucide-react";
import Link from "next/link";
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
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [targetModuleIdForNote, setTargetModuleIdForNote] = useState<string | undefined>(undefined);

  // Edit Course Modal state
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDesc, setEditCourseDesc] = useState("");
  const [editCourseDomain, setEditCourseDomain] = useState("");

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

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !editCourseTitle.trim()) return;

    try {
      const updated = await notesService.updateCourse(selectedCourse.id, {
        title: editCourseTitle.trim(),
        description: editCourseDesc.trim(),
        domain: editCourseDomain.trim(),
      });
      setSelectedCourse((prev) => (prev ? { ...prev, ...updated } : null));
      setCourses((prev) =>
        prev.map((c) => (c.id === selectedCourse.id ? { ...c, ...updated } : c))
      );
      setIsEditCourseOpen(false);
    } catch (err) {
      console.error("Error updating course:", err);
      alert("Failed to update course.");
    }
  };

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
                    <Link
                      href={`/notes?course=${selectedCourse.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#A85D44]" />
                      <span>Open in Reader</span>
                    </Link>

                    {/* Super Admin Course Editing */}
                    {isSuper && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditCourseTitle(selectedCourse.title);
                          setEditCourseDesc(selectedCourse.description || "");
                          setEditCourseDomain(selectedCourse.domain || "");
                          setIsEditCourseOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#A85D44]" />
                        <span>Edit Course</span>
                      </button>
                    )}

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
                      const moduleNotes = notes.filter((n) => n.module_id === mod.id);
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
                              {moduleNotes.map((note) => {
                                const isEditingNote = editingNoteId === note.id;

                                return (
                                  <div
                                    key={note.id}
                                    className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1B19] border border-[#E8E3D9]/60 dark:border-[#33312E]/60 hover:border-[#A85D44]/30 transition-all text-xs"
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
                                      <div className="flex items-center gap-2 min-w-0 mr-2">
                                        <FileText className="w-3.5 h-3.5 text-[#A85D44] shrink-0" />
                                        <span className="font-medium text-[#2D2926] dark:text-[#E3DFD7] truncate">
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
                                          className="p-1.5 rounded-lg text-[#757069] hover:text-[#2D2926] hover:bg-[#EFEBE3] transition-colors"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>

                                        {/* Rename Note */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingNoteId(note.id);
                                            setEditingNoteTitle(note.title);
                                          }}
                                          title="Rename Note"
                                          className="p-1.5 rounded-lg text-[#757069] hover:text-[#A85D44] hover:bg-[#EFEBE3] transition-colors"
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
                      const unassignedNotes = notes.filter((n) => !n.module_id);
                      if (unassignedNotes.length === 0) return null;

                      return (
                        <div className="rounded-2xl border border-dashed border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/50 dark:bg-[#21201E]/50 p-4 sm:p-5 space-y-3">
                          <h3 className="text-xs font-bold text-[#757069] uppercase tracking-wider">
                            Unassigned Notes ({unassignedNotes.length})
                          </h3>
                          <div className="space-y-1.5">
                            {unassignedNotes.map((note) => (
                              <div
                                key={note.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#1C1B19] border border-[#E8E3D9] dark:border-[#33312E] text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 mr-2">
                                  <FileText className="w-3.5 h-3.5 text-[#757069] shrink-0" />
                                  <span className="font-medium text-[#2D2926] dark:text-[#E3DFD7] truncate">
                                    {note.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
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

      {selectedCourse && isSuper && (
        <CourseAccessModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          course={selectedCourse}
        />
      )}

      {/* Edit Course Modal */}
      {isEditCourseOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl text-[#2D2926] dark:text-[#E3DFD7]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E3D9] dark:border-[#33312E]">
              <h3 className="text-base font-bold">Edit Course Details</h3>
              <button
                type="button"
                onClick={() => setIsEditCourseOpen(false)}
                className="p-1 rounded-lg text-[#757069] hover:text-[#2D2926]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateCourse} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={editCourseTitle}
                  onChange={(e) => setEditCourseTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] outline-none focus:border-[#A85D44]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Domain</label>
                <input
                  type="text"
                  value={editCourseDomain}
                  onChange={(e) => setEditCourseDomain(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] outline-none focus:border-[#A85D44]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editCourseDesc}
                  onChange={(e) => setEditCourseDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] outline-none focus:border-[#A85D44]"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditCourseOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#757069] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
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

