"use client";

import React, { useState } from "react";
import type { Course, Module, Note } from "@/lib/supabase/types";
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  Search,
  Brain,
  Plus,
  BookOpen,
  ShieldCheck,
  FolderPlus,
  Trash2,
  Pencil,
  Check,
  X
} from "lucide-react";
import Link from "next/link";

interface CourseSidebarProps {
  courses: Course[];
  selectedCourse: Course | null;
  onSelectCourse: (course: Course) => void;
  modules: Module[];
  notes: Note[];
  activeNoteId?: string;
  onSelectNote: (note: Note) => void;
  onAddCourse?: () => void;
  onDeleteCourse?: (course: Course) => void;
  onAddNote?: () => void;
  onAddModule?: () => void;
  onUpdateModule?: (module: Module, newTitle: string) => void;
  onDeleteModule?: (module: Module) => void;
  onUpdateNote?: (note: Note, newTitle: string) => void;
  onDeleteNote?: (note: Note) => void;
  pendingCount?: number;
  canManageAccess?: boolean;
  onManageAccess?: () => void;
  readOnly?: boolean;
}

export function CourseSidebar({
  courses,
  selectedCourse,
  onSelectCourse,
  modules,
  notes,
  activeNoteId,
  onSelectNote,
  onAddCourse,
  onDeleteCourse,
  onAddNote,
  onAddModule,
  onUpdateModule,
  onDeleteModule,
  onUpdateNote,
  onDeleteNote,
  pendingCount = 0,
  canManageAccess = false,
  onManageAccess,
  readOnly = false,
}: CourseSidebarProps) {
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");

  const toggleModule = (modId: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [modId]: !prev[modId],
    }));
  };

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-72 shrink-0 border-r border-[#E8E3D9] dark:border-[#33312E] bg-[#F5F2EB] dark:bg-[#181716] flex flex-col h-full min-h-[calc(100vh-4rem)]">
      {/* Course Info Header & Course Switcher */}
      <div className="p-4 border-b border-[#E8E3D9] dark:border-[#33312E] relative">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-xs text-[#A85D44] dark:text-[#C4785E] font-medium">
            <Brain className="w-3.5 h-3.5" />
            <span>{selectedCourse?.domain || "Academic Curriculum"}</span>
          </div>
          <div className="flex items-center gap-1">
            {!readOnly && canManageAccess && selectedCourse && (
              <>
                <button
                  type="button"
                  onClick={onManageAccess}
                  title="Manage course collaborator access"
                  className="p-1 rounded hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#A85D44] dark:text-[#C4785E] transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                </button>
                {onDeleteCourse && (
                  <button
                    type="button"
                    onClick={() => onDeleteCourse(selectedCourse)}
                    title={`Delete course "${selectedCourse.title}"`}
                    className="p-1 rounded hover:bg-rose-500/10 text-stone-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {!readOnly && onAddCourse && (
              <button
                type="button"
                onClick={onAddCourse}
                title="Create new course"
                className="p-1 rounded hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-[#757069] dark:text-[#948F86] transition-colors"
              >
                <Plus className="w-4 h-4 text-[#A85D44] dark:text-[#C4785E]" />
              </button>
            )}
          </div>
        </div>

        {selectedCourse ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
              className="w-full flex items-center justify-between text-left group"
            >
              <h2 className="text-sm font-semibold text-[#2D2926] dark:text-[#E3DFD7] line-clamp-1 group-hover:text-[#A85D44] transition-colors">
                {selectedCourse.title}
              </h2>
              {courses.length > 1 && (
                <ChevronDown className="w-3.5 h-3.5 text-[#757069] shrink-0 ml-1" />
              )}
            </button>

            {/* Courses list dropdown */}
            {isCourseDropdownOpen && courses.length > 1 && (
              <div className="absolute left-0 top-full mt-2 w-full p-1.5 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-lg z-50 animate-in fade-in">
                <span className="text-[10px] uppercase font-semibold text-[#757069] px-2 py-1 block">
                  Switch Course
                </span>
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between group/citem ${
                      c.id === selectedCourse.id
                        ? "bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] font-semibold"
                        : "text-[#2D2926] dark:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#292825]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCourse(c);
                        setIsCourseDropdownOpen(false);
                      }}
                      className="flex-1 text-left truncate mr-2"
                    >
                      {c.title}
                    </button>
                    {canManageAccess && onDeleteCourse && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCourseDropdownOpen(false);
                          onDeleteCourse(c);
                        }}
                        title={`Delete course "${c.title}"`}
                        className="opacity-0 group-hover/citem:opacity-100 p-1 rounded hover:bg-rose-500/10 text-stone-400 hover:text-rose-600 transition-all shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-1 mt-1 border-t border-[#E8E3D9] dark:border-[#33312E]">
                  <Link
                    href="/"
                    onClick={() => setIsCourseDropdownOpen(false)}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#A85D44] dark:text-[#C4785E] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] font-semibold transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Browse All Courses →</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-[#757069]">
            <p className="mb-2">No courses published yet.</p>
            <button
              type="button"
              onClick={onAddCourse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A85D44] text-white text-xs font-medium hover:bg-[#8F4C35] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Course</span>
            </button>
          </div>
        )}
      </div>

      {/* Global Filter / Search Bar */}
      {selectedCourse && (
        <div className="p-3 border-b border-[#E8E3D9]/60 dark:border-[#33312E]/60 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#757069]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes & topics..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-[#2D2926] dark:text-[#E3DFD7] placeholder:text-[#757069]/70 outline-none focus:border-[#A85D44]"
            />
          </div>
          {!readOnly && onAddNote && (
            <button
              type="button"
              onClick={onAddNote}
              title="Create note in this course"
              className="p-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] text-[#A85D44] dark:text-[#C4785E] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Syllabus Modules & Note Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedCourse && (
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#757069] dark:text-[#948F86]">
              Modules & Notes
            </span>
            {!readOnly && canManageAccess && onAddModule && (
              <button
                type="button"
                onClick={onAddModule}
                title="Add new module"
                className="flex items-center gap-1 text-[11px] font-medium text-[#A85D44] dark:text-[#C4785E] hover:underline"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Module</span>
              </button>
            )}
          </div>
        )}

        {modules.map((mod) => {
          const isCollapsed = collapsedModules[mod.id];
          const moduleNotes = filteredNotes.filter(
            (n) => n.module_id === mod.id || (!n.module_id && modules[0]?.id === mod.id)
          );

          return (
            <div key={mod.id} className="group/mod space-y-1">
              {editingModuleId === mod.id ? (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#FAF8F5] dark:bg-[#21201E] rounded-md border border-[#A85D44]/40 shadow-sm">
                  <input
                    type="text"
                    autoFocus
                    value={editingModuleTitle}
                    onChange={(e) => setEditingModuleTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (editingModuleTitle.trim() && onUpdateModule) {
                          onUpdateModule(mod, editingModuleTitle.trim());
                        }
                        setEditingModuleId(null);
                      } else if (e.key === "Escape") {
                        setEditingModuleId(null);
                      }
                    }}
                    className="flex-1 text-xs px-1.5 py-0.5 bg-transparent border-none outline-none font-medium text-[#2D2926] dark:text-[#E3DFD7]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editingModuleTitle.trim() && onUpdateModule) {
                        onUpdateModule(mod, editingModuleTitle.trim());
                      }
                      setEditingModuleId(null);
                    }}
                    title="Save module title"
                    className="p-1 rounded hover:bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] transition-colors"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingModuleId(null);
                    }}
                    title="Cancel"
                    className="p-1 rounded hover:bg-stone-500/10 text-[#757069] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between text-left px-2 py-1 rounded-md hover:bg-[#EFEBE3] dark:hover:bg-[#292825] text-xs font-medium text-[#757069] dark:text-[#948F86] transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    onDoubleClick={(e) => {
                      if (canManageAccess && onUpdateModule) {
                        e.stopPropagation();
                        setEditingModuleId(mod.id);
                        setEditingModuleTitle(mod.title);
                      }
                    }}
                    className="flex-1 flex items-center justify-between text-left min-w-0 pr-1.5"
                  >
                    <span className="line-clamp-1">{mod.title}</span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[#757069] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#757069] shrink-0" />
                    )}
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {canManageAccess && onUpdateModule && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingModuleId(mod.id);
                          setEditingModuleTitle(mod.title);
                        }}
                        title={`Edit module title "${mod.title}"`}
                        className="opacity-0 group-hover/mod:opacity-100 p-1 rounded hover:bg-[#A85D44]/10 text-stone-400 hover:text-[#A85D44] dark:hover:text-[#C4785E] transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    {canManageAccess && onDeleteModule && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteModule(mod);
                        }}
                        title={`Delete module "${mod.title}"`}
                        className="opacity-0 group-hover/mod:opacity-100 p-1 rounded hover:bg-rose-500/10 text-stone-400 hover:text-rose-600 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!isCollapsed && (
                <div className="pl-2 space-y-0.5 border-l border-[#E8E3D9] dark:border-[#33312E] ml-2">
                  {moduleNotes.map((note) => {
                    const isActive = note.id === activeNoteId;

                    if (editingNoteId === note.id) {
                      return (
                        <div
                          key={note.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-[#FAF8F5] dark:bg-[#21201E] rounded-md border border-[#A85D44]/40 shadow-sm my-0.5"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={editingNoteTitle}
                            onChange={(e) => setEditingNoteTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (editingNoteTitle.trim() && onUpdateNote) {
                                  onUpdateNote(note, editingNoteTitle.trim());
                                }
                                setEditingNoteId(null);
                              } else if (e.key === "Escape") {
                                setEditingNoteId(null);
                              }
                            }}
                            className="flex-1 text-xs px-1.5 py-0.5 bg-transparent border-none outline-none font-medium text-[#2D2926] dark:text-[#E3DFD7]"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingNoteTitle.trim() && onUpdateNote) {
                                onUpdateNote(note, editingNoteTitle.trim());
                              }
                              setEditingNoteId(null);
                            }}
                            title="Save note title"
                            className="p-1 rounded hover:bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNoteId(null);
                            }}
                            title="Cancel"
                            className="p-1 rounded hover:bg-stone-500/10 text-[#757069] transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={note.id}
                        className={`group/note w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                          isActive
                            ? "bg-[#FAF8F5] dark:bg-[#21201E] text-[#2D2926] dark:text-[#E3DFD7] font-semibold border border-[#E8E3D9] dark:border-[#33312E] shadow-sm"
                            : "text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] hover:text-[#2D2926]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectNote(note)}
                          onDoubleClick={(e) => {
                            if (canManageAccess && onUpdateNote) {
                              e.stopPropagation();
                              setEditingNoteId(note.id);
                              setEditingNoteTitle(note.title);
                            }
                          }}
                          className="flex-1 flex items-center gap-2 min-w-0 text-left"
                        >
                          <FileText
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive
                                ? "text-[#A85D44] dark:text-[#C4785E]"
                                : "text-[#757069]"
                            }`}
                          />
                          <span className="truncate">{note.title}</span>
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0 ml-1">
                          {canManageAccess && onUpdateNote && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNoteId(note.id);
                                setEditingNoteTitle(note.title);
                              }}
                              title={`Rename note "${note.title}"`}
                              className="opacity-0 group-hover/note:opacity-100 p-1 rounded hover:bg-[#A85D44]/10 text-stone-400 hover:text-[#A85D44] dark:hover:text-[#C4785E] transition-all"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                          {canManageAccess && onDeleteNote && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteNote(note);
                              }}
                              title={`Delete note "${note.title}"`}
                              className="opacity-0 group-hover/note:opacity-100 p-1 rounded hover:bg-rose-500/10 text-stone-400 hover:text-rose-600 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {moduleNotes.length === 0 && (
                    <div className="px-2 py-1.5 text-[11px] text-[#757069] italic">
                      No notes yet. Click + above to add one.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {selectedCourse && modules.length === 0 && (
          <div className="p-4 text-center text-xs text-[#757069] border border-dashed border-[#E8E3D9] dark:border-[#33312E] rounded-xl">
            <BookOpen className="w-5 h-5 mx-auto mb-1 text-[#A85D44]" />
            <p>No modules yet in this course.</p>
            {canManageAccess && onAddModule ? (
              <button
                type="button"
                onClick={onAddModule}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#A85D44] text-white text-xs font-medium hover:bg-[#8F4C35] transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add First Module</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onAddNote}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#A85D44] text-white text-xs font-medium hover:bg-[#8F4C35] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Note</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
