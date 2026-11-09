"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { 
  LogIn, 
  LogOut, 
  ChevronDown 
} from "lucide-react";

export function UserMenu() {
  const { user, profile, isSuperAdmin, signOut } = useAuth();
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
              {isSuperAdmin ? "Super Admin" : profile?.role === "core_team" ? "Core Team" : "Contributor"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#757069]" />
          </button>
        ) : (
          // Guest User State with Sign In CTA
          <button
            type="button"
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A85D44] hover:bg-[#8F4C35] text-white text-xs font-medium shadow-sm transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Dropdown Menu */}
        {isMenuOpen && user && (
          <div className="absolute right-0 top-full mt-2 w-56 p-2 rounded-xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-lg z-50 animate-in fade-in slide-in-from-top-1 text-[#2D2926] dark:text-[#E3DFD7]">
            <div className="px-3 py-2 border-b border-[#E8E3D9] dark:border-[#33312E] mb-1">
              <p className="text-xs font-semibold truncate">{profile?.display_name}</p>
              <p className="text-[11px] text-[#757069] dark:text-[#948F86] truncate">{user.email}</p>
              <div className="mt-1">
                <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-[#A85D44]/10 text-[#A85D44] dark:text-[#C4785E] font-semibold">
                  {isSuperAdmin ? "Role: Super Admin" : profile?.role === "core_team" ? "Role: Core Team" : "Role: Contributor"}
                </span>
              </div>
            </div>

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

