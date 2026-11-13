"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Module, Note } from "@/lib/supabase/types";
import { X, FolderInput, Layers, FileText, Check, Loader2 } from "lucide-react";

interface MoveNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
  modules: Module[];
  onConfirmMove: (note: Note, targetModuleId: string | null) => Promise<void>;
}

export function MoveNoteModal({
  isOpen,
  onClose,
  note,
  modules,
  onConfirmMove,
}: MoveNoteModalProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (note && isOpen) {
      setSelectedModuleId(note.module_id || null);
    }
  }, [note, isOpen]);

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

  if (!isOpen || !mounted || !note) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirmMove(note, selectedModuleId);
      onClose();
    } catch {
      // Error handling is managed by parent
    } finally {
      setLoading(false);
    }
  };

  const currentModuleId = note.module_id || null;
  const isChanged = selectedModuleId !== currentModuleId;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-note-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E3D9] dark:border-[#33312E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#A85D44]/10 dark:bg-[#A85D44]/20 text-[#A85D44] dark:text-[#C4785E] flex items-center justify-center">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h2 id="move-note-title" className="text-sm font-bold text-[#2D2926] dark:text-[#E3DFD7]">
                Move Note to Module
              </h2>
              <p className="text-[11px] text-[#757069] dark:text-[#948F86] truncate max-w-[260px]">
                {note.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#757069] hover:text-[#2D2926] dark:hover:text-[#E3DFD7] hover:bg-[#EFEBE3] dark:hover:bg-[#2C2A28] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Module Selection List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          <p className="text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-3">
            Select the destination module for this note:
          </p>

          {/* All Course Modules */}
          {modules.map((mod) => {
            const isSelected = selectedModuleId === mod.id;
            const isOriginal = currentModuleId === mod.id;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedModuleId(mod.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs ${
                  isSelected
                    ? "border-[#A85D44] bg-[#A85D44]/5 dark:bg-[#A85D44]/10 text-[#2D2926] dark:text-[#E3DFD7] font-semibold"
                    : "border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#1C1B19] hover:border-[#A85D44]/40 text-[#2D2926] dark:text-[#E3DFD7]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Layers className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#A85D44]" : "text-[#757069]"}`} />
                  <div className="truncate">
                    <span className="block truncate">{mod.title}</span>
                    {isOriginal && (
                      <span className="text-[10px] text-[#757069] dark:text-[#948F86] font-normal">
                        (Current module)
                      </span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#A85D44] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}

          {/* Standalone / Unassigned Option */}
          {(() => {
            const isSelected = selectedModuleId === null;
            const isOriginal = currentModuleId === null;

            return (
              <button
                type="button"
                onClick={() => setSelectedModuleId(null)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs ${
                  isSelected
                    ? "border-[#A85D44] bg-[#A85D44]/5 dark:bg-[#A85D44]/10 text-[#2D2926] dark:text-[#E3DFD7] font-semibold"
                    : "border-dashed border-[#E8E3D9] dark:border-[#33312E] bg-white/50 dark:bg-[#1C1B19]/50 hover:border-[#A85D44]/40 text-[#2D2926] dark:text-[#E3DFD7]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className={`w-4 h-4 shrink-0 ${isSelected ? "text-[#A85D44]" : "text-[#757069]"}`} />
                  <div>
                    <span className="block font-medium">Unassigned / General</span>
                    <span className="text-[10px] text-[#757069] dark:text-[#948F86] font-normal">
                      Standalone note not linked to any module
                      {isOriginal ? " (Current)" : ""}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#A85D44] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })()}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5]/80 dark:bg-[#21201E]/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] hover:bg-[#EFEBE3] dark:hover:bg-[#2C2A28] text-xs font-semibold text-[#757069] dark:text-[#948F86] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !isChanged}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-semibold shadow-xs disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Moving...</span>
              </>
            ) : (
              <>
                <FolderInput className="w-3.5 h-3.5" />
                <span>Move Note</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

