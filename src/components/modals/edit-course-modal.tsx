"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { notesService } from "@/lib/data/notes-service";
import { extractErrorMessage } from "@/lib/utils";
import type { Course } from "@/lib/supabase/types";
import { X, BookOpen, AlertCircle, Check, Loader2 } from "lucide-react";

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onCourseUpdated: (updatedCourse: Course) => void;
}

export function EditCourseModal({
  isOpen,
  onClose,
  course,
  onCourseUpdated,
}: EditCourseModalProps) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [domain, setDomain] = useState(course.domain || "Computer Science");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && course) {
      setTitle(course.title);
      setDescription(course.description || "");
      setDomain(course.domain || "Computer Science");
      setError(null);
    }
  }, [isOpen, course]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const updated = await notesService.updateCourse(course.id, {
        title: title.trim(),
        description: description.trim(),
        domain: domain.trim() || undefined,
      });

      onCourseUpdated(updated);
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl text-[#2D2926] dark:text-[#E3DFD7]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-course-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-md text-[#757069] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#A85D44] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E]">
              Course Settings
            </span>
          </div>
          <h2 id="edit-course-modal-title" className="text-2xl font-bold tracking-tight">
            Edit Course Details
          </h2>
          <p className="text-xs text-[#757069] dark:text-[#948F86] mt-1">
            Update the title, academic domain, and syllabus overview description.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-1.5 uppercase tracking-wider">
              Course Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Systems & Consensus"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85D44]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-1.5 uppercase tracking-wider">
              Academic Domain / Category
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. Computer Science, Machine Learning"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85D44]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope, core topics, and target audience for this curriculum."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85D44]/30 resize-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

