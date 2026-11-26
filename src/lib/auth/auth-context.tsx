"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  type User as FirebaseUser 
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/config";
import { notesService } from "@/lib/data/notes-service";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/supabase/types";

export const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "jatinkumar79911@gmail.com"
).toLowerCase();

interface AuthContextType {
  user: FirebaseUser | null;
  profile: Profile | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isCoreTeam: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  simulateRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function resolveUserProfile(firebaseUser: FirebaseUser): Promise<Profile> {
  const userEmail = (firebaseUser.email || "").toLowerCase();
  const isMaster = userEmail === SUPER_ADMIN_EMAIL;

  // Clear any legacy simulation artifacts
  if (typeof window !== "undefined") {
    localStorage.removeItem("vilekh-user-role");
  }

  // Ensure user profile exists in Supabase
  await notesService.syncUserProfile(firebaseUser).catch(() => {});

  // Fetch actual role and profile metadata from Supabase
  const supabase = createClient();
  let dbRole: UserRole = "contributor";
  let dbUsername = "";
  let dbDisplayName = "";
  let dbAvatar: string | undefined;

  try {
    const { data } = await supabase
      .from("profiles")
      .select("role, username, display_name, avatar_url")
      .eq("id", firebaseUser.uid)
      .maybeSingle();

    if (data) {
      if (data.role) dbRole = data.role as UserRole;
      if (data.username) dbUsername = data.username;
      if (data.display_name) dbDisplayName = data.display_name;
      if (data.avatar_url) dbAvatar = data.avatar_url;
    }
  } catch {
    // Non-blocking fallback
  }

  const assignedRole: UserRole = isMaster ? "super_admin" : dbRole;

  return {
    id: firebaseUser.uid,
    username: dbUsername || firebaseUser.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "_") || "user",
    display_name: dbDisplayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
    avatar_url: dbAvatar || firebaseUser.photoURL || undefined,
    role: assignedRole,
    created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vilekh-user-role");
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const resolved = await resolveUserProfile(firebaseUser);
        setProfile(resolved);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      setUser(firebaseUser);
      const resolved = await resolveUserProfile(firebaseUser);
      setProfile(resolved);
    } catch (err: unknown) {
      console.error("Firebase Google Auth error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("vilekh-user-role");
    }
  };

  const simulateRole = (_role: UserRole) => {
    // No-op: Genuine database roles are strictly enforced
  };

  const isSuperAdmin = Boolean(
    (user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) ||
    profile?.role === "super_admin"
  );

  const isCoreTeam = Boolean(
    isSuperAdmin || 
    profile?.role === "core_team" || 
    profile?.role === "super_admin"
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isSuperAdmin,
        isCoreTeam,
        signInWithGoogle,
        signOut,
        simulateRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** The auth context, or null outside an AuthProvider (e.g. dev harness pages). */
export function useOptionalAuth() {
  return useContext(AuthContext) ?? null;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
