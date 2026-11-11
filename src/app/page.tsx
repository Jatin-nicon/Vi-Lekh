"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { notesService } from "@/lib/data/notes-service";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import type { CourseWithStats } from "@/lib/supabase/types";
import { 
  BookOpen, 
  Search, 
  Loader2, 
  FileText, 
  Layers, 
  ArrowRight,
  Globe
} from "lucide-react";
import Link from "next/link";

function CoursesContent() {
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  const loadCoursesData = useCallback(async () => {
    try {
      setLoading(true);
      const coursesWithStats = await notesService.getCoursesWithDetails();
      setCourses(coursesWithStats);
    } catch (err) {
      console.error("Error loading courses:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoursesData();
  }, [loadCoursesData]);

  // Unique domains for filtering
  const domains = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => {
      if (c.domain) set.add(c.domain);
    });
    return Array.from(set).sort();
  }, [courses]);

  // Filter courses based on search query and selected domain
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchText =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.domain || "").toLowerCase().includes(q) ||
        (c.slug || "").toLowerCase().includes(q);

      if (!matchText) return false;

      if (selectedDomain !== "all" && c.domain !== selectedDomain) {
        return false;
      }

      return true;
    });
  }, [courses, searchQuery, selectedDomain]);

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
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        {/* Hero Section */}
        <div className="pb-6 border-b border-[#E8E3D9] dark:border-[#33312E]">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#A85D44]/10 text-[#A85D44] dark:text-[#C4785E] text-xs font-semibold mb-3">
            <Globe className="w-3.5 h-3.5" />
            <span>Academic Curriculums & Notes</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#2D2926] dark:text-[#E3DFD7]">
            Course Directory & Syllabi
          </h1>
          <p className="text-xs sm:text-sm text-[#757069] dark:text-[#948F86] mt-1.5 max-w-2xl leading-relaxed">
            Explore academic courses, read structured lecture notes, and study comprehensive syllabi in a clean, distraction-free environment.
          </p>
        </div>

        {/* Search & Domain Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757069] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, topics, codes..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-[#2D2926] dark:text-[#E3DFD7] placeholder:text-[#757069] outline-none focus:border-[#A85D44] transition-colors"
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 bg-[#FAF8F5] dark:bg-[#21201E] p-1 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] text-xs">
            <button
              type="button"
              onClick={() => setSelectedDomain("all")}
              className={`px-3 py-1 rounded-lg transition-colors font-medium shrink-0 ${
                selectedDomain === "all"
                  ? "bg-[#A85D44] text-white shadow-xs font-semibold"
                  : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
              }`}
            >
              All ({courses.length})
            </button>
            {domains.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => setSelectedDomain(domain)}
                className={`px-3 py-1 rounded-lg transition-colors font-medium shrink-0 ${
                  selectedDomain === domain
                    ? "bg-[#A85D44] text-white shadow-xs font-semibold"
                    : "text-[#757069] dark:text-[#948F86] hover:text-[#2D2926]"
                }`}
              >
                {domain}
              </button>
            ))}
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
            <p className="text-xs text-[#757069] dark:text-[#948F86]">
              {searchQuery
                ? `No courses matched your query "${searchQuery}".`
                : "No courses have been published yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredCourses.map((course) => {
              return (
                <div
                  key={course.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#A85D44]/40 transition-all"
                >
                  <div>
                    {/* Header: Domain tag */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#EBE6DC] dark:bg-[#2B2A27] text-[#757069] dark:text-[#948F86] font-medium truncate">
                        {course.domain || "Curriculum"}
                      </span>
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
                    </div>

                    {/* Action Button: Open Syllabus */}
                    <div className="pt-1">
                      <Link
                        href={`/notes?course=${course.id}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#EFEBE3] dark:bg-[#292825] hover:bg-[#A85D44] hover:text-white dark:hover:bg-[#A85D44] dark:hover:text-white text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] transition-all"
                      >
                        <span>Open Syllabus & Notes</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
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
