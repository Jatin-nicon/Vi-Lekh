"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { 
  User, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  ChevronDown,
  Sparkles
} from "lucide-react";

export function UserMenu() {
  const { user, profile, isSuperAdmin, isCoreTeam, signOut, simulateRole } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative" ref={menuRef}>
        {user ? (
          // Logged In User Pill
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors text-xs font-medium"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#A85D44]/20 text-[#A85D44] dark:text-[#C4785E] flex items-center justify-center font-bold text-[11px]">
                {profile?.display_name ? profile.display_name[0].toUpperCase() : "U"}
              </div>
            )}
            <span className="max-w-[100px] truncate text-[#2D2926] dark:text-[#E3DFD7]">
              {profile?.display_name}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#A85D44]/15 text-[#A85D44] dark:text-[#C4785E] font-semibold uppercase">
              {isSuperAdmin ? "Super Admin" : profile?.role === "core_team" ? "Staff" : "Learner"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#757069]" />
          </button>
        ) : (
          // Guest User State with Sign In CTA
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-medium shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            
            {/* Quick Demo Role Switcher for preview */}
            <button
              type="button"
              onClick={() => simulateRole(isCoreTeam ? "contributor" : "core_team")}
              title="Toggle preview role between Core Team and Contributor"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-[#FAF8F5] dark:bg-[#21201E] text-xs font-medium text-[#757069] dark:text-[#948F86] hover:bg-[#EFEBE3] dark:hover:bg-[#292825] transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#A85D44] dark:text-[#C4785E]" />
              <span className="text-[11px]">Sim: {profile?.role}</span>
            </button>
          </div>
        )}

        {/* Dropdown Menu */}
        {isMenuOpen && user && (
          <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-lg z-50 animate-in fade-in slide-in-from-top-1 text-[#2D2926] dark:text-[#E3DFD7]">
            <div className="px-3 py-2 border-b border-[#E8E3D9] dark:border-[#33312E] mb-1">
              <p className="text-xs font-semibold truncate">{profile?.display_name}</p>
              <p className="text-[11px] text-[#757069] dark:text-[#948F86] truncate">{user.email}</p>
            </div>

            {/* Role switch toggle */}
            <div className="px-3 py-2 text-xs">
              <span className="text-[#757069] text-[11px] block mb-1">Test Role Simulation:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => simulateRole("core_team")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    profile?.role === "core_team"
                      ? "bg-[#A85D44] text-white"
                      : "bg-[#F5F2EB] dark:bg-[#181716] text-[#757069] hover:bg-[#EFEBE3]"
                  }`}
                >
                  Core Team
                </button>
                <button
                  type="button"
                  onClick={() => simulateRole("contributor")}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    profile?.role === "contributor"
                      ? "bg-[#A85D44] text-white"
                      : "bg-[#F5F2EB] dark:bg-[#181716] text-[#757069] hover:bg-[#EFEBE3]"
                  }`}
                >
                  Contributor
                </button>
              </div>
            </div>

            <div className="border-t border-[#E8E3D9] dark:border-[#33312E] my-1" />

            {/* Sign Out */}
            <button
              type="button"
              onClick={() => {
                signOut();
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Auth Dialog */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}

