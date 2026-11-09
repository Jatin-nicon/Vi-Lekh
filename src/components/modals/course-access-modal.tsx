"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { notesService } from "@/lib/data/notes-service";
import { extractErrorMessage } from "@/lib/utils";
import type { Course, CourseMember, CourseRole, Profile } from "@/lib/supabase/types";
import { 
  X, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Search, 
  Loader2, 
  AlertCircle,
  Crown,
  CheckCircle2,
  Lock
} from "lucide-react";

interface CourseAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

export function CourseAccessModal({ isOpen, onClose, course }: CourseAccessModalProps) {
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Search state for adding collaborators
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CourseRole>("editor");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notesService.getCourseMembers(course.id);
      setMembers(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [course.id]);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, loadMembers]);

  // Handle keyboard escape and background scroll
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

  // Search profiles as user types
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await notesService.searchProfiles(searchQuery);
        // Filter out users already in members list
        const existingIds = new Set(members.map((m) => m.user_id));
        setSearchResults(results.filter((p) => !existingIds.has(p.id)));
      } catch {
        // Non-blocking
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, members]);

  if (!isOpen || !mounted) return null;

  const handleAddMember = async (profile: Profile) => {
    try {
      setActionLoading(true);
      setError(null);
      await notesService.addCourseMember(course.id, profile.id, selectedRole);
      setSuccess(`Added ${profile.display_name} as ${selectedRole}`);
      setSearchQuery("");
      setSearchResults([]);
      await loadMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: CourseRole) => {
    try {
      setActionLoading(true);
      setError(null);
      await notesService.updateCourseMemberRole(memberId, newRole);
      await loadMembers();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this course?`)) return;
    try {
      setActionLoading(true);
      setError(null);
      await notesService.removeCourseMember(memberId);
      setSuccess(`Removed access for ${name}`);
      await loadMembers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl text-[#2D2926] dark:text-[#E3DFD7]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-md text-[#757069] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#A85D44] text-white flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E]">
                Course Access & Collaborator Management
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                {course.title}
              </h2>
            </div>
          </div>
          <p className="text-xs text-[#757069] dark:text-[#948F86] mt-1">
            As the Super Admin, you can grant granular editing, contribution, or view-only access to users for this course.
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Add Collaborator Section */}
        <div className="mb-6 p-4 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716]">
          <label className="block text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-2 uppercase tracking-wider">
            Grant Collaborator Access
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#757069]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered user by name or username..."
                className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-xs text-[#2D2926] dark:text-[#E3DFD7] focus:outline-none focus:ring-2 focus:ring-[#A85D44]/30"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as CourseRole)}
              className="px-3 py-2 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#A85D44]/30"
            >
              <option value="editor">Editor (Permanent Direct Edit & Publish)</option>
              <option value="admin">Admin (Full Course Management)</option>
              <option value="contributor">Contributor (Suggest Revisions)</option>
              <option value="viewer">Viewer (Read-only)</option>
            </select>
          </div>

          {/* Search Results Dropdown */}
          {isSearching && (
            <div className="mt-2 text-xs text-[#757069] flex items-center gap-1.5 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A85D44]" />
              <span>Searching users...</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 divide-y divide-[#E8E3D9] dark:divide-[#33312E] border border-[#E8E3D9] dark:border-[#33312E] rounded-lg overflow-hidden bg-[#FAF8F5] dark:bg-[#21201E]">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.display_name} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#A85D44]/20 text-[#A85D44] flex items-center justify-center text-xs font-bold">
                        {p.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold">{p.display_name}</p>
                      <p className="text-[10px] text-[#757069]">@{p.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleAddMember(p)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#A85D44] hover:bg-[#8F4C35] text-white text-[11px] font-medium transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Add as {selectedRole}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing Collaborators List */}
        <div>
          <h3 className="text-xs font-semibold text-[#757069] dark:text-[#948F86] mb-3 uppercase tracking-wider">
            Current Course Collaborators ({members.length})
          </h3>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#757069]">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#A85D44] mb-2" />
              <span>Loading access list...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-[#E8E3D9] dark:border-[#33312E] text-xs text-[#757069]">
              <Lock className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-[#A85D44]" />
              <p className="font-medium">No individual collaborator roles configured yet.</p>
              <p className="text-[11px] mt-0.5">Only the Super Admin has full publishing rights for this course.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716]"
                >
                  <div className="flex items-center gap-2.5">
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.display_name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#A85D44]/20 text-[#A85D44] flex items-center justify-center font-bold text-xs">
                        {member.profile?.display_name ? member.profile.display_name[0].toUpperCase() : "U"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">
                          {member.profile?.display_name || "Vi-Lekh User"}
                        </span>
                        {member.user_id === course.created_by && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
                            <Crown className="w-3 h-3" />
                            Creator
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#757069] dark:text-[#948F86]">
                        @{member.profile?.username || member.user_id.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      disabled={actionLoading}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as CourseRole)}
                      className="px-2 py-1 rounded-md border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#A85D44]"
                    >
                      <option value="editor">Editor</option>
                      <option value="contributor">Contributor</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleRemoveMember(member.id, member.profile?.display_name || "user")}
                      title="Revoke course access"
                      className="p-1.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#E8E3D9]/60 dark:border-[#33312E] flex items-center justify-between text-xs text-[#757069]">
          <span className="text-[11px]">Roles take effect instantly across note editing and reviews.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#EFEBE3] dark:bg-[#292825] hover:bg-[#E8E3D9] text-[#2D2926] dark:text-[#E3DFD7] font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

