"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth/auth-context";
import { X, AlertCircle, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key press
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

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-2xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl text-[#2D2926] dark:text-[#E3DFD7]"
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
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#A85D44] text-white flex items-center justify-center font-bold text-lg shadow-sm mx-auto mb-3">
            वि
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A85D44] dark:text-[#C4785E] block mb-1">
            Firebase Google Authentication
          </span>
          <h2 className="text-xl font-bold tracking-tight">
            Sign In to Vi-Lekh
          </h2>
          <p className="text-xs text-[#757069] dark:text-[#948F86] mt-1.5 leading-relaxed">
            Collaborate on academic curriculum, propose block revisions, and review community technical notes.
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Google Sign In Primary CTA */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                await signInWithGoogle();
                onClose();
              } catch (err: unknown) {
                if (err instanceof Error) {
                  if (err.message.includes("auth/unauthorized-domain")) {
                    setError(
                      "Domain not authorized in Firebase. Please add 'localhost' to Authorized Domains in your Firebase Console (Authentication > Settings > Authorized domains)."
                    );
                  } else if (err.message.includes("auth/popup-closed-by-user")) {
                    setError("Sign-in cancelled by user.");
                  } else {
                    setError(err.message);
                  }
                } else {
                  setError("An unexpected error occurred during Google Sign-In.");
                }
              } finally {
                setLoading(false);
              }
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] hover:bg-stone-50 dark:hover:bg-[#252321] text-xs font-semibold text-[#2D2926] dark:text-[#E3DFD7] shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>
        </div>

        {/* Security / Privacy Footer */}
        <div className="mt-6 pt-4 border-t border-[#E8E3D9]/60 dark:border-[#33312E] text-center text-[11px] text-[#757069] dark:text-[#948F86]">
          <div className="flex items-center justify-center gap-1.5 text-[#5D7063] dark:text-[#768D7D] font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Secure Firebase Authentication</span>
          </div>
          <p>Project: <code className="text-[10px] bg-[#EBE6DC] dark:bg-[#2B2A27] px-1 py-0.5 rounded">vi-lekh</code></p>
        </div>
      </div>
    </div>,
    document.body
  );
}
