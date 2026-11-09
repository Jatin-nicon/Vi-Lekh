"use client";

import React, { useState, useEffect, useCallback } from "react";
import { notesService } from "@/lib/data/notes-service";
import { useAuth, AuthProvider } from "@/lib/auth/auth-context";
import { CourseSidebar } from "@/components/navigation/course-sidebar";
import { NoteReader } from "@/components/reader/note-reader";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { CreateCourseModal } from "@/components/modals/create-course-modal";
import { CreateNoteModal } from "@/components/modals/create-note-modal";
import { CreateModuleModal } from "@/components/modals/create-module-modal";
import { CourseAccessModal } from "@/components/modals/course-access-modal";
import { extractErrorMessage } from "@/lib/utils";
import type { Course, Module, Note, Revision } from "@/lib/supabase/types";
import { 
  GitPullRequest, 
  BookOpen,
  Plus,
  Loader2,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function MainContent() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeRevision, setActiveRevision] = useState<Revision | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);

  // Modals state
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const [courseRole, setCourseRole] = useState<string>("viewer");

  // 1. Initial Load of Courses & Pending Revisions
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesList, pendingRevs] = await Promise.all([
        notesService.getCourses(),
        notesService.getPendingRevisions().catch(() => []),
      ]);

      setCourses(coursesList);
      setPendingCount(pendingRevs.length);

      if (coursesList.length > 0) {
        setSelectedCourse(coursesList[0]);
      } else {
        setSelectedCourse(null);
        setModules([]);
        setNotes([]);
        setActiveNote(null);
        setActiveRevision(null);
      }
    } catch (err) {
      console.error("Error loading courses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Load Modules and Notes when Selected Course Changes
  const loadCourseData = useCallback(async (course: Course) => {
    try {
      const [{ modules: m, notes: n }, role] = await Promise.all([
        notesService.getCourseWithModulesAndNotes(course.id),
        notesService.getUserCourseRole(course.id, course.created_by).catch(() => "viewer"),
      ]);
      setModules(m);
      setNotes(n);
      setCourseRole(role);

      if (n.length > 0) {
        // Select first note
        loadNoteData(n[0].id);
      } else {
        setActiveNote(null);
        setActiveRevision(null);
      }
    } catch (err) {
      console.error("Error loading course data:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse);
    }
  }, [selectedCourse, loadCourseData]);

  useEffect(() => {
    if (selectedCourse) {
      notesService
        .getUserCourseRole(selectedCourse.id, selectedCourse.created_by)
        .then(setCourseRole)
        .catch(() => setCourseRole("viewer"));
    }
  }, [selectedCourse, user]);

  // 3. Load Active Note and its Active Revision
  const loadNoteData = async (noteId: string) => {
    try {
      setNoteLoading(true);
      const { note, currentRevision } = await notesService.getNote(noteId);
      setActiveNote(note);
      setActiveRevision(currentRevision);
    } catch (err) {
      console.error("Error loading note:", err);
    } finally {
      setNoteLoading(false);
    }
  };

  const handleCourseCreated = (newCourse: Course) => {
    setCourses((prev) => [...prev, newCourse]);
    setSelectedCourse(newCourse);
  };

  const handleNoteCreated = (newNote: Note) => {
    setNotes((prev) => [...prev, newNote]);
    loadNoteData(newNote.id);
  };

  const handleModuleCreated = (newMod: Module) => {
    setModules((prev) => [...prev, newMod]);
  };

  const handleDeleteCourse = async (course: Course) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete course "${course.title}"?\n\nThis will remove all associated modules, notes, and revisions.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await notesService.deleteCourse(course.id);
      const remaining = courses.filter((c) => c.id !== course.id);
      setCourses(remaining);
      if (remaining.length > 0) {
        setSelectedCourse(remaining[0]);
      } else {
        setSelectedCourse(null);
        setModules([]);
        setNotes([]);
        setActiveNote(null);
        setActiveRevision(null);
      }
    } catch (err) {
      alert(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateModule = async (mod: Module, newTitle: string) => {
    try {
      const updated = await notesService.updateModule(mod.id, { title: newTitle });
      setModules((prev) => prev.map((m) => (m.id === mod.id ? updated : m)));
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleUpdateNote = async (note: Note, newTitle: string) => {
    try {
      const updated = await notesService.updateNote(note.id, { title: newTitle });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
      if (activeNote?.id === note.id) {
        setActiveNote(updated);
      }
    } catch (err: unknown) {
      alert(extractErrorMessage(err));
    }
  };

  const handleDeleteModule = async (mod: Module) => {
    if (
      !confirm(
        `Are you sure you want to delete module "${mod.title}"?\n\nNotes belonging to this module will be unassigned.`
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

  const handleDeleteNote = async (note: Note) => {
    if (!confirm(`Are you sure you want to delete note "${note.title}"?`)) {
      return;
    }

    try {
      await notesService.deleteNote(note.id);
      const remaining = notes.filter((n) => n.id !== note.id);
      setNotes(remaining);
      if (activeNote?.id === note.id) {
        if (remaining.length > 0) {
          loadNoteData(remaining[0].id);
        } else {
          setActiveNote(null);
          setActiveRevision(null);
        }
      }
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A85D44] text-white flex items-center justify-center font-bold text-base shadow-sm">
                वि
              </div>
              <span className="font-semibold text-lg tracking-tight text-[#2D2926] dark:text-[#E3DFD7]">
                Vi-Lekh
              </span>
            </Link>
            <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#757069] dark:text-[#948F86] font-medium">
              Academic Notes & Wiki
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />

            <Link
              href="/reviews"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span>Reviews</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#A85D44] text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Link>

            {/* User Account & Auth Menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E8E3D9] dark:border-[#33312E]">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12 text-[#757069]">
          <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
          <span className="text-sm">Connecting to database...</span>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row">
          {/* Course Syllabus Sidebar */}
          <CourseSidebar
            courses={courses}
            selectedCourse={selectedCourse}
            onSelectCourse={(c) => setSelectedCourse(c)}
            modules={modules}
            notes={notes}
            activeNoteId={activeNote?.id}
            onSelectNote={(n) => loadNoteData(n.id)}
            onAddCourse={() => setIsCreateCourseOpen(true)}
            onDeleteCourse={handleDeleteCourse}
            onAddNote={() => setIsCreateNoteOpen(true)}
            onAddModule={() => setIsCreateModuleOpen(true)}
            onUpdateModule={handleUpdateModule}
            onDeleteModule={handleDeleteModule}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            pendingCount={pendingCount}
            canManageAccess={Boolean(
              isSuperAdmin ||
              (selectedCourse && (selectedCourse.created_by === user?.uid || courseRole === "admin" || courseRole === "editor"))
            )}
            onManageAccess={() => setIsAccessModalOpen(true)}
          />

          {/* Note Reader Body */}
          <main className="flex-1 min-w-0 bg-[#F5F2EB] dark:bg-[#181716] overflow-y-auto p-4 sm:p-6">
            {noteLoading ? (
              <div className="py-24 text-center text-xs text-[#757069]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A85D44]" />
                Loading technical note...
              </div>
            ) : activeNote ? (
              <NoteReader
                note={activeNote}
                revision={activeRevision}
                courseTitle={selectedCourse?.title || "Curriculum"}
                onProposeEdit={() => router.push(`/edit?note=${activeNote.id}`)}
              />
            ) : selectedCourse ? (
              /* Course exists, but no notes created yet */
              <div className="max-w-2xl mx-auto my-12 p-8 sm:p-12 text-center bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] shadow-sm">
                <BookOpen className="w-10 h-10 text-[#A85D44] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#2D2926] dark:text-[#E3DFD7] mb-1">
                  {selectedCourse.title}
                </h3>
                <p className="text-xs text-[#757069] dark:text-[#948F86] mb-6 max-w-md mx-auto">
                  {selectedCourse.description}
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateNoteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Technical Note</span>
                </button>
              </div>
            ) : (
              /* Empty Database: No courses yet */
              <div className="max-w-2xl mx-auto my-12 p-8 sm:p-12 text-center bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#A85D44]/10 text-[#A85D44] flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#2D2926] dark:text-[#E3DFD7] mb-2">
                  Welcome to Vi-Lekh
                </h3>
                <p className="text-xs text-[#757069] dark:text-[#948F86] mb-6 max-w-md mx-auto leading-relaxed">
                  Your live PostgreSQL backend is connected and ready. You are running with real data. Create your first course to begin building syllabus notes.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateCourseOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Course Syllabus</span>
                </button>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Creation Modals */}
      <CreateCourseModal
        isOpen={isCreateCourseOpen}
        onClose={() => setIsCreateCourseOpen(false)}
        onCourseCreated={handleCourseCreated}
      />

      {selectedCourse && (
        <CreateModuleModal
          isOpen={isCreateModuleOpen}
          onClose={() => setIsCreateModuleOpen(false)}
          courseId={selectedCourse.id}
          courseTitle={selectedCourse.title}
          existingCount={modules.length}
          onModuleCreated={handleModuleCreated}
        />
      )}

      {selectedCourse && (
        <CreateNoteModal
          isOpen={isCreateNoteOpen}
          onClose={() => setIsCreateNoteOpen(false)}
          courseId={selectedCourse.id}
          modules={modules}
          onNoteCreated={handleNoteCreated}
        />
      )}

      {selectedCourse && (
        <CourseAccessModal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          course={selectedCourse}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
