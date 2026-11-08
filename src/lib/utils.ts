import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deterministically formats dates to avoid SSR / Client hydration mismatches
 * (e.g. produces "Nov 5, 2026" consistently across any server/client locale or timezone)
 */
export function formatDate(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Deterministically formats time in UTC (e.g. "14:30 UTC")
 */
export function formatTime(dateInput: string | Date | number): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const hours = d.getUTCHours().toString().padStart(2, "0");
  const minutes = d.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes} UTC`;
}

/**
 * Extracts a descriptive error message from Supabase PostgrestError, Firebase Auth, or standard Error objects
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "An unknown error occurred.";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const errorObj = err as Record<string, unknown>;
    if (errorObj.code === "22P02") {
      return "Database schema mismatch (Postgres 22P02): Supabase columns expect UUIDs, but Firebase provides string UIDs. Please run migration 003_firebase_auth_support.sql in Supabase SQL Editor.";
    }
    if (errorObj.code === "42501") {
      return "Row-level security error (Postgres 42501): Permission denied. Please run migration 003_firebase_auth_support.sql in Supabase SQL Editor.";
    }
    if (typeof errorObj.message === "string") {
      return errorObj.details ? `${errorObj.message} (${errorObj.details})` : errorObj.message;
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}



