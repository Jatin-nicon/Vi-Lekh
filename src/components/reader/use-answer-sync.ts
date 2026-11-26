"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FIELDS_CHANGED_EVENT,
  FIELDS_UPDATED_EVENT,
  cleanAnswers,
  hasAnswers,
  mergeAnswers,
  readLocalAnswers,
  sameAnswers,
  writeLocalAnswers,
} from "@/lib/layout/answer-sync";
import type { SyncStatus } from "./use-annotation-sync";

const SAVE_DELAY_MS = 2000;

/**
 * Saves the reader's answers to a note's fill-in fields to their account 2s
 * after the last change, and merges the account copy field by field when the
 * note opens or the user signs in.
 */
export function useAnswerSync({ noteId, storageKey, userId }: { noteId: string; storageKey: string; userId: string | null }) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [hasData, setHasData] = useState(false);
  // A new note starts from its own state (reset during render, not in an effect).
  const [shownKey, setShownKey] = useState<string | null>(null);
  if (shownKey !== storageKey && typeof window !== "undefined") {
    setShownKey(storageKey);
    setHasData(hasAnswers(readLocalAnswers(localStorage, storageKey)));
    setStatus("idle");
  }
  const syncRef = useRef<() => Promise<void>>(async () => {});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const dirtyRef = useRef(false);

  /** Merges the account copy into this device and uploads the result if it differs. */
  const sync = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (!userId) {
      if (dirtyRef.current) setStatus("signed-out");
      return;
    }
    if (busyRef.current) {
      timerRef.current = setTimeout(() => void syncRef.current(), SAVE_DELAY_MS);
      return;
    }
    busyRef.current = true;
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from("note_answers")
        .select("answers")
        .eq("user_id", userId)
        .eq("note_id", noteId)
        .maybeSingle();
      if (error) throw error;
      const remote = cleanAnswers(data?.answers);
      const local = readLocalAnswers(localStorage, storageKey);
      const merged = mergeAnswers(local, remote);
      if (!sameAnswers(merged, local)) {
        writeLocalAnswers(localStorage, storageKey, merged);
        window.dispatchEvent(new CustomEvent(FIELDS_UPDATED_EVENT, { detail: { storageKey } }));
      }
      setHasData(hasAnswers(merged));
      if (!sameAnswers(merged, remote)) {
        setStatus("saving");
        const { error: upsertError } = await supabase
          .from("note_answers")
          .upsert({ user_id: userId, note_id: noteId, answers: merged, updated_at: new Date().toISOString() }, { onConflict: "user_id,note_id" });
        if (upsertError) throw upsertError;
      }
      // An edit made during the round trip is picked up by the next run.
      if (sameAnswers(readLocalAnswers(localStorage, storageKey), merged)) dirtyRef.current = false;
      setStatus(dirtyRef.current ? "saving" : "saved");
      if (dirtyRef.current) timerRef.current = setTimeout(() => void syncRef.current(), SAVE_DELAY_MS);
    } catch (err) {
      console.warn("Answer sync failed:", err);
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }, [noteId, storageKey, userId]);
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  useEffect(() => {
    // First merge right after mount (not inside the effect body itself).
    const first = setTimeout(() => void sync(), 0);
    const onChanged = (e: Event) => {
      if ((e as CustomEvent<{ storageKey: string }>).detail?.storageKey !== storageKey) return;
      dirtyRef.current = true;
      setHasData(true);
      setStatus(userId ? "saving" : "signed-out");
      if (!userId) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void syncRef.current(), SAVE_DELAY_MS);
    };
    const onOnline = () => {
      if (dirtyRef.current) void sync();
    };
    window.addEventListener(FIELDS_CHANGED_EVENT, onChanged);
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(first);
      window.removeEventListener(FIELDS_CHANGED_EVENT, onChanged);
      window.removeEventListener("online", onOnline);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        void sync();
      }
    };
  }, [storageKey, sync, userId]);

  return { status, hasData, retry: () => void sync() };
}
