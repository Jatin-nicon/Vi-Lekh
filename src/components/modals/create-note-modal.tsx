"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { notesService } from "@/lib/data/notes-service";
import { extractErrorMessage } from "@/lib/utils";
import type { Module, Note } from "@/lib/supabase/types";
import { X, FileText, AlertCircle, ArrowRight } from "lucide-react";

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  modules: Module[];
  defaultModuleId?: string;
  onNoteCreated: (note: Note) => void;
}

export function CreateNoteModal({
  isOpen,
  onClose,
  courseId,
  modules,
  defaultModuleId,
  onNoteCreated,
}: CreateNoteModalProps) {
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState(defaultModuleId || modules[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure selected moduleId always matches a currently existing module or defaultModuleId
  useEffect(() => {
    if (isOpen) {
      if (defaultModuleId && modules.some((m) => m.id === defaultModuleId)) {
        setModuleId(defaultModuleId);
      } else if (modules.length > 0) {
        const isCurrentValid = modules.some((m) => m.id === moduleId);
        if (!isCurrentValid) {
          setModuleId(modules[0].id);
        }
      } else {
        setModuleId("");
      }
    }
  }, [isOpen, modules, moduleId, defaultModuleId]);

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
    setError(null);
    setLoading(true);

    try {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Resolve valid module_id
      const targetModuleId = modules.some((m) => m.id === moduleId)
        ? moduleId
        : (modules[0]?.id || undefined);

      const note = await notesService.createNote({
        course_id: courseId,
        module_id: targetModuleId || undefined,
        title,
        slug: slug || "note-" + Date.now().toString(36),
      });

      onNoteCreated(note);
      setTitle("");
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedValue = modules.some((m) => m.id === moduleId)
    ? moduleId
    : (modules[0]?.id || "");

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl text-[#2D2926] dark:text-[#E3DFD7]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-md text-[#757069] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#A85D44] text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E]">
              New Topic
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Note</h2>
          <p className="text-xs text-[#757069] dark:text-[#948F86] mt-1">
            Add a new note with baseline blocks to the course syllabus.
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
              Note Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Backpropagation & Computation Graphs"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85D44]/30"
            />
          </div>

          {modules.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-1.5 uppercase tracking-wider">
                Module
              </label>
              <select
                value={selectedValue}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] text-[#2D2926] dark:text-[#E3DFD7] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85D44]/30"
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
                <option value="">(No Module / General Course Note)</option>
              </select>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <span>{loading ? "Creating Note..." : "Create Note"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
