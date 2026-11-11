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
  Sparkles
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

  return (
    <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] flex flex-col font-sans transition-colors print:min-h-0 print:bg-white print:text-black">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB]/95 dark:bg-[#181716]/95 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 print:hidden">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span>All Courses</span>
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
          {/* Pure Read-Only Course Syllabus Sidebar */}
          <div className="print:hidden">
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
              onSelectNote={(n) => loadNoteData(n.id)}
              readOnly={true}
            />
          </div>

          {/* Note Reader Body */}
          <main className="flex-1 min-w-0 bg-[#F5F2EB] dark:bg-[#181716] overflow-visible p-4 sm:p-6 print:overflow-visible print:h-auto print:w-full print:max-w-none print:p-0 print:m-0 print:block print:bg-white">
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
