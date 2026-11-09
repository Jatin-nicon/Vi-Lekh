"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { notesService } from "@/lib/data/notes-service";
import { useAuth, AuthProvider } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { CreateCourseModal } from "@/components/modals/create-course-modal";
import { CourseAccessModal } from "@/components/modals/course-access-modal";
import { extractErrorMessage } from "@/lib/utils";
import type { Course, CourseWithStats } from "@/lib/supabase/types";
import { 
  BookOpen, 
  GitPullRequest, 
  Plus, 
  Search, 
  Loader2, 
  ShieldCheck, 
  Crown, 
  FileText, 
  Layers, 
  Users, 
  ArrowRight,
  Trash2,
  Sparkles,
  CheckCircle2,
  Lock,
  Globe
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function CoursesContent() {
  const router = useRouter();
  const { user, isSuperAdmin } = useAuth();

  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "mine" | "editor">("all");
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Modals state
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [selectedAccessCourse, setSelectedAccessCourse] = useState<Course | null>(null);

  const loadCoursesData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesWithStats, pendingRevs] = await Promise.all([
        notesService.getCoursesWithDetails(),
        notesService.getPendingRevisions().catch(() => []),
      ]);
      setCourses(coursesWithStats);
      setPendingCount(pendingRevs.length);
    } catch (err) {
      console.error("Error loading courses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoursesData();
  }, [loadCoursesData]);

  const handleCourseCreated = (newCourse: Course) => {
    loadCoursesData();
    setIsCreateCourseOpen(false);
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
      await notesService.deleteCourse(course.id);
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  // Filter courses based on search and user affiliation
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // 1. Text search
      const q = searchQuery.toLowerCase().trim();
      const matchText =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.domain || "").toLowerCase().includes(q) ||
        (c.slug || "").toLowerCase().includes(q);

      if (!matchText) return false;

      // 2. Filter tabs
      if (activeFilter === "mine") {
        return c.created_by === user?.uid || isSuperAdmin;
      }
      if (activeFilter === "editor") {
        if (isSuperAdmin || c.created_by === user?.uid) return true;
        const membership = c.members.find((m) => m.user_id === user?.uid);
        return membership?.role === "admin" || membership?.role === "editor";
      }

      return true;
    });
  }, [courses, searchQuery, activeFilter, user, isSuperAdmin]);

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
              Academic Curriculums
            </span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
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

            <div className="flex items-center gap-2 pl-2 border-l border-[#E8E3D9] dark:border-[#33312E]">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E8E3D9] dark:border-[#33312E]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A85D44]/10 text-[#A85D44] dark:text-[#C4785E] text-xs font-semibold mb-3">
              <Globe className="w-3.5 h-3.5" />
              <span>Open Collaborative Learning</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#2D2926] dark:text-[#E3DFD7]">
              Course Directory & Syllabi
            </h1>
            <p className="text-xs sm:text-sm text-[#757069] dark:text-[#948F86] mt-1.5 max-w-2xl leading-relaxed">
              Explore academic courses, read structured lecture notes, suggest improvements, or grant permanent editing privileges to collaborators.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateCourseOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757069] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, topics, codes..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-[#2D2926] dark:text-[#E3DFD7] placeholder:text-[#757069] outline-none focus:border-[#A85D44] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#757069] hover:text-[#2D2926]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#FAF8F5] dark:bg-[#21201E] p-1 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                activeFilter === "all"
                  ? "bg-[#A85D44] text-white shadow-xs font-semibold"
                  : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
              }`}
            >
              All Courses ({courses.length})
            </button>
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveFilter("mine")}
                  className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                    activeFilter === "mine"
                      ? "bg-[#A85D44] text-white shadow-xs font-semibold"
                      : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
                  }`}
                >
                  My Courses
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("editor")}
                  className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                    activeFilter === "editor"
                      ? "bg-[#A85D44] text-white shadow-xs font-semibold"
                      : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
                  }`}
                >
                  Permanent Editor
                </button>
              </>
            )}
          </div>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="py-24 text-center text-xs text-[#757069]">
            <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mx-auto mb-2" />
            <span>Loading academic courses catalog...</span>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto p-8 rounded-2xl border border-dashed border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/50 dark:bg-[#21201E]/50">
            <BookOpen className="w-10 h-10 text-[#A85D44] mx-auto mb-3" />
            <h3 className="text-base font-bold mb-1">No courses found</h3>
            <p className="text-xs text-[#757069] dark:text-[#948F86] mb-5">
              {searchQuery
                ? `No courses matched your query "${searchQuery}".`
                : "No courses have been published yet. Be the first to start a curriculum!"}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateCourseOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A85D44] text-white text-xs font-semibold hover:bg-[#8F4C35] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Course</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredCourses.map((course) => {
              const isOwner = course.created_by === user?.uid;
              const canManage = isSuperAdmin || isOwner;
              const userMembership = course.members.find((m) => m.user_id === user?.uid);
              const hasPermanentEdit =
                isSuperAdmin || isOwner || userMembership?.role === "admin" || userMembership?.role === "editor";

              return (
                <div
                  key={course.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#A85D44]/40 transition-all"
                >
                  <div>
                    {/* Header: Domain tag & User Role Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#757069] dark:text-[#948F86] font-medium truncate">
                        {course.domain || "Curriculum"}
                      </span>

                      {/* Access status badge */}
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                          <Crown className="w-3 h-3" />
                          Super Admin
                        </span>
                      ) : isOwner ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] border border-[#A85D44]/30">
                          <Crown className="w-3 h-3" />
                          Owner (Admin)
                        </span>
                      ) : hasPermanentEdit ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#5D7063]/15 text-[#5D7063] dark:text-[#768D7D] border border-[#5D7063]/30">
                          <ShieldCheck className="w-3 h-3" />
                          Permanent Editor
                        </span>
                      ) : user ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <Sparkles className="w-3 h-3" />
                          Suggest Edits
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#757069] italic">Public Course</span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-[#2D2926] dark:text-[#E3DFD7] group-hover:text-[#A85D44] dark:group-hover:text-[#C4785E] transition-colors line-clamp-1">
                      {course.title}
                    </h2>

                    {/* Description */}
                    <p className="text-xs text-[#757069] dark:text-[#948F86] mt-2 line-clamp-3 leading-relaxed min-h-[3rem]">
                      {course.description || "Comprehensive academic syllabus and technical lecture notes."}
                    </p>
                  </div>

                  <div className="pt-5 mt-4 border-t border-[#E8E3D9]/60 dark:border-[#33312E]/60 space-y-3">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-[#757069] dark:text-[#948F86]">
                      <div className="flex items-center gap-1" title={`${course.moduleCount} modules`}>
                        <Layers className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
                        <span>{course.moduleCount} {course.moduleCount === 1 ? "module" : "modules"}</span>
                      </div>
                      <div className="flex items-center gap-1" title={`${course.noteCount} notes`}>
                        <FileText className="w-3.5 h-3.5 text-[#757069]" />
                        <span>{course.noteCount} {course.noteCount === 1 ? "note" : "notes"}</span>
                      </div>
                      {course.memberCount > 0 && (
                        <div className="flex items-center gap-1" title={`${course.memberCount} collaborators`}>
                          <Users className="w-3.5 h-3.5 text-[#5D7063]" />
                          <span>{course.memberCount} {course.memberCount === 1 ? "editor" : "editors"}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {/* Open Syllabus button -> routes to /notes?course=... */}
                      <Link
                        href={`/notes?course=${course.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#EFEBE3] dark:bg-[#292825] hover:bg-[#A85D44] hover:text-white dark:hover:bg-[#A85D44] dark:hover:text-white text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] transition-all"
                      >
                        <span>Open Syllabus & Notes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {/* Course Owner Controls (Manage Access & Delete) */}
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedAccessCourse(course)}
                            title="Manage Access & Collaborators (Grant Permanent Edit Access)"
                            className="p-2 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#A85D44] dark:text-[#C4785E] hover:bg-[#A85D44]/10 transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCourse(course)}
                            title={`Delete course "${course.title}"`}
                            className="p-2 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Creation Modal */}
      <CreateCourseModal
        isOpen={isCreateCourseOpen}
        onClose={() => setIsCreateCourseOpen(false)}
        onCourseCreated={handleCourseCreated}
      />

      {/* Collaborator Access Management Modal */}
      {selectedAccessCourse && (
        <CourseAccessModal
          isOpen={Boolean(selectedAccessCourse)}
          onClose={() => setSelectedAccessCourse(null)}
          course={selectedAccessCourse}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <Suspense fallback={
        <div className="min-h-screen bg-[#F5F2EB] dark:bg-[#181716] flex items-center justify-center p-12 text-[#757069]">
          <Loader2 className="w-6 h-6 animate-spin text-[#A85D44] mr-2" />
          <span className="text-sm font-medium">Loading courses directory...</span>
        </div>
      }>
        <CoursesContent />
      </Suspense>
    </AuthProvider>
  );
}
