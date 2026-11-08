"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  type User as FirebaseUser 
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/config";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userEmail = (firebaseUser.email || "").toLowerCase();
        const isMaster = userEmail === SUPER_ADMIN_EMAIL;
        
        const savedRole = typeof window !== "undefined" 
          ? (localStorage.getItem("vilekh-user-role") as UserRole) 
          : null;
        
        const assignedRole: UserRole = isMaster 
          ? "super_admin" 
          : (savedRole || "contributor");

        const userProfile: Profile = {
          id: firebaseUser.uid,
          username: firebaseUser.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "_") || "user",
          display_name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          avatar_url: firebaseUser.photoURL || undefined,
          role: assignedRole,
          created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(userProfile);
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
      const userEmail = (firebaseUser.email || "").toLowerCase();
      const isMaster = userEmail === SUPER_ADMIN_EMAIL;
      
      const savedRole = typeof window !== "undefined" 
        ? (localStorage.getItem("vilekh-user-role") as UserRole) 
        : null;

      const assignedRole: UserRole = isMaster 
        ? "super_admin" 
        : (savedRole || "contributor");

      const newProfile: Profile = {
        id: firebaseUser.uid,
        username: firebaseUser.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "_") || "user",
        display_name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
        avatar_url: firebaseUser.photoURL || undefined,
        role: assignedRole,
        created_at: firebaseUser.metadata.creationTime || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(firebaseUser);
      setProfile(newProfile);
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

  const simulateRole = (role: UserRole) => {
    if (profile) {
      const updated = { ...profile, role };
      setProfile(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("vilekh-user-role", role);
      }
    }
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
