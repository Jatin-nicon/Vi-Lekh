"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { notesService } from "@/lib/data/notes-service";
import { AuthProvider } from "@/lib/auth/auth-context";
import { CourseSidebar } from "@/components/navigation/course-sidebar";
import { NoteReader } from "@/components/reader/note-reader";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import type { Course, Module, Note, Revision } from "@/lib/supabase/types";
import { 
  BookOpen,
  Loader2,
  Menu,
  Sparkles,
  X
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function NotesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseParam = searchParams.get("course");
  const noteParam = searchParams.get("note");

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeRevision, setActiveRevision] = useState<Revision | null>(null);

  const [loading, setLoading] = useState(true);
  const [noteLoading, setNoteLoading] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // 1. Initial Load of Courses
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const coursesList = await notesService.getCourses();
      setCourses(coursesList);

      if (coursesList.length > 0) {
        const found = courseParam 
          ? coursesList.find((c) => c.id === courseParam || c.slug === courseParam)
          : null;
        setSelectedCourse(found || coursesList[0]);
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
  }, [courseParam]);

  // Keep selected course synchronized if query param changes externally
  useEffect(() => {
    if (courseParam && courses.length > 0) {
      const match = courses.find((c) => c.id === courseParam || c.slug === courseParam);
      if (match && match.id !== selectedCourse?.id) {
        setSelectedCourse(match);
      }
    }
  }, [courseParam, courses, selectedCourse?.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 2. Load Active Note and its Active Revision
  const loadNoteData = useCallback(async (noteId: string) => {
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
  }, []);

  const handleSelectNote = useCallback((n: Note) => {
    loadNoteData(n.id);
    setIsMobileDrawerOpen(false);
  }, [loadNoteData]);

  // 3. Load Modules and Notes when Selected Course Changes
  const loadCourseData = useCallback(async (course: Course) => {
    try {
      const { modules: m, notes: n } = await notesService.getCourseWithModulesAndNotes(course.id);
      setModules(m);
      setNotes(n);

      if (n.length > 0) {
        // If noteParam is present and belongs to this course, select it
        const targetNote = noteParam ? n.find((item) => item.id === noteParam || item.slug === noteParam) : null;
        loadNoteData(targetNote ? targetNote.id : n[0].id);
      } else {
        setActiveNote(null);
        setActiveRevision(null);
      }
    } catch (err) {
      console.error("Error loading course data:", err);
    }
  }, [noteParam, loadNoteData]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse);
    }
  }, [selectedCourse, loadCourseData]);

  // Left-edge swipe gesture to open/close mobile syllabus drawer
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isEdgeSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      // Trigger opening only if gesture begins within 32px of the left screen edge
      isEdgeSwipe = !isMobileDrawerOpen && touchStartX <= 32;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // Horizontal swipe to right from left edge opens drawer
      if (isEdgeSwipe && deltaX > 45 && Math.abs(deltaY) < 90) {
        setIsMobileDrawerOpen(true);
      } else if (isMobileDrawerOpen && deltaX < -50 && Math.abs(deltaY) < 90) {
        // Horizontal swipe to left closes drawer
        setIsMobileDrawerOpen(false);
      }
      isEdgeSwipe = false;
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobileDrawerOpen]);

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] flex flex-col font-sans transition-colors print:min-h-0 print:bg-white print:text-black">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-50 px-4 sm:px-6 print:hidden">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Syllabus Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
              className={`md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                isMobileDrawerOpen
                  ? "border-[#A85D44] bg-[#FAF4EC] dark:bg-[#2A231F] text-[#A85D44] dark:text-[#C4785E]"
                  : "border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-[#757069] dark:text-[#948F86] hover:text-[#A85D44] hover:bg-[#EFEBE3]"
              }`}
              aria-label={isMobileDrawerOpen ? "Close Course Syllabus" : "Open Course Syllabus"}
              aria-expanded={isMobileDrawerOpen}
            >
              {isMobileDrawerOpen ? (
                <X className="w-4 h-4 text-[#A85D44]" />
              ) : (
                <Menu className="w-4 h-4 text-[#A85D44]" />
              )}
              <span className="font-semibold text-xs">Syllabus</span>
            </button>

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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="relative flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors"
              title="All Courses"
              aria-label="All Courses"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span className="hidden sm:inline">All Courses</span>
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-[#E8E3D9] dark:border-[#33312E]">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12 text-[#757069]">
          <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
          <span className="text-sm">Connecting to curriculum database...</span>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row print:max-w-none print:w-full print:block print:p-0 print:m-0">
          {/* Desktop Pinned Split-Scrolling Sidebar */}
          <div className="hidden md:block sticky top-16 h-[calc(100vh-4rem)] overflow-hidden shrink-0 print:hidden">
            <CourseSidebar
              courses={courses}
              selectedCourse={selectedCourse}
              onSelectCourse={(c) => {
                setSelectedCourse(c);
                router.replace(`/notes?course=${c.id}`, { scroll: false });
              }}
              modules={modules}
              notes={notes}
              activeNoteId={activeNote?.id}
              onSelectNote={handleSelectNote}
              readOnly={true}
            />
          </div>

          {/* Mobile Syllabus Off-Canvas Drawer */}
          <div
            className={`md:hidden fixed inset-0 z-40 print:hidden transition-all duration-300 ease-in-out ${
              isMobileDrawerOpen
                ? "opacity-100 pointer-events-auto visible"
                : "opacity-0 pointer-events-none invisible"
            }`}
          >
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
                isMobileDrawerOpen ? "opacity-100" : "opacity-0"
              }`}
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Container with smooth slide transition */}
            <div
              className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-[#F5F2EB] dark:bg-[#181716] shadow-2xl flex flex-col h-full transition-transform duration-300 ease-in-out will-change-transform ${
                isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* Drawer Header with Close Button */}
              <div className="p-3 border-b border-[#E8E3D9] dark:border-[#33312E] flex items-center justify-between shrink-0 bg-[#FAF8F5] dark:bg-[#21201E]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Course Syllabus</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-[#757069] hover:text-[#2D2926] hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] transition-colors cursor-pointer"
                  aria-label="Close Syllabus Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar inside Drawer */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <CourseSidebar
                  className="w-full border-r-0"
                  courses={courses}
                  selectedCourse={selectedCourse}
                  onSelectCourse={(c) => {
                    setSelectedCourse(c);
                    router.replace(`/notes?course=${c.id}`, { scroll: false });
                  }}
                  modules={modules}
                  notes={notes}
                  activeNoteId={activeNote?.id}
                  onSelectNote={handleSelectNote}
                  readOnly={true}
                />
              </div>
            </div>
          </div>

          {/* Note Reader Body */}
          <main className="flex-1 min-w-0 bg-[#F5F2EB] dark:bg-[#181716] overflow-visible p-3 sm:p-6 print:overflow-visible print:h-auto print:w-full print:max-w-none print:p-0 print:m-0 print:block print:bg-white">
            {noteLoading ? (
              <div className="py-24 text-center text-xs text-[#757069]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#A85D44]" />
                Loading lecture note...
              </div>
            ) : activeNote ? (
              <NoteReader
                note={activeNote}
                revision={activeRevision}
                courseTitle={selectedCourse?.title || "Curriculum"}
              />
            ) : selectedCourse ? (
              /* Course exists, but no notes created yet */
              <div className="max-w-2xl mx-auto my-12 p-8 sm:p-12 text-center bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] shadow-sm">
                <BookOpen className="w-10 h-10 text-[#A85D44] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#2D2926] dark:text-[#E3DFD7] mb-1">
                  {selectedCourse.title}
                </h3>
                <p className="text-xs text-[#757069] dark:text-[#948F86] max-w-md mx-auto">
                  {selectedCourse.description || "No lecture notes have been published for this course yet."}
                </p>
              </div>
            ) : (
              /* No courses in database */
              <div className="max-w-md mx-auto my-16 p-8 text-center bg-[#FAF8F5] dark:bg-[#21201E] rounded-2xl border border-[#E8E3D9] dark:border-[#33312E]">
                <Sparkles className="w-8 h-8 text-[#A85D44] mx-auto mb-3" />
                <h3 className="text-base font-bold mb-1">No Courses Found</h3>
                <p className="text-xs text-[#757069] dark:text-[#948F86]">
                  No academic curriculums are currently available.
                </p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] flex items-center justify-center p-12 text-[#757069]">
          <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
          <span className="text-sm font-medium">Loading curriculum...</span>
        </div>
      }>
        <NotesContent />
      </Suspense>
    </AuthProvider>
  );
}
