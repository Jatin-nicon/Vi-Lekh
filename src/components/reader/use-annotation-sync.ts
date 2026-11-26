"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AnnotationLayout } from "@/lib/annotations/storage-keys";
import {
  isEmptyPage,
  loadMeta,
  normalizePage,
  pageFingerprint,
  planMerge,
  readLocalPages,
  saveMeta,
  writeLocalPage,
  type PageAnnotations,
  type RemotePage,
  type SyncMeta,
} from "@/lib/annotations/annotation-sync";
import type { AnnotationShape, AnnotationStroke, AnnotationTextBox } from "./annotation-layer";

export type SyncStatus = "idle" | "saving" | "saved" | "signed-out" | "error";

const SAVE_DELAY_MS = 2000;

interface Options {
  noteId: string;
  layout: AnnotationLayout;
  revisionId?: string | null;
  /** Firebase uid of the signed-in user, or null when signed out. */
  userId: string | null;
  strokes: Record<number, AnnotationStroke[]>;
  shapes: Record<number, AnnotationShape[]>;
  textBoxes: Record<number, AnnotationTextBox[]>;
  /** Puts a page's annotations on screen (the hook writes localStorage itself). */
  applyPage: (page: number, data: PageAnnotations) => void;
}

/**
 * Saves the reader's annotations to their account 2s after the last change,
 * and merges the account copy into this device when a note opens or the user
 * signs in (design D10).
 */
export function useAnnotationSync({ noteId, layout, revisionId, userId, strokes, shapes, textBoxes, applyPage }: Options) {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const scope = `${layout}|${noteId}`;
  const scopeRef = useRef(scope);
  /** Fingerprint per page of what is known on this device; null until hydrated. */
  const knownRef = useRef<{ scope: string; pages: Record<number, string> } | null>(null);
  /** Pages the hook just put on screen: renders until they appear are not edits. */
  const pendingRef = useRef(new Map<number, { fp: string; until: number }>());
  const metaRef = useRef<SyncMeta>({});
  const dirtyRef = useRef(new Set<number>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushingRef = useRef(false);
  const live = useRef({ strokes, shapes, textBoxes, userId, revisionId, applyPage });
  const flushRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    scopeRef.current = scope;
    live.current = { strokes, shapes, textBoxes, userId, revisionId, applyPage };
  });

  const currentPage = (page: number): PageAnnotations =>
    normalizePage({
      strokes: live.current.strokes[page],
      shapes: live.current.shapes[page],
      textBoxes: live.current.textBoxes[page],
    });

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const startScope = scopeRef.current;
    const [startLayout, startNote] = [layout, noteId];
    if (dirtyRef.current.size === 0) return;
    const uid = live.current.userId;
    if (!uid) {
      setStatus("signed-out");
      return;
    }
    if (flushingRef.current) {
      timerRef.current = setTimeout(() => void flushRef.current(), SAVE_DELAY_MS);
      return;
    }
    flushingRef.current = true;
    setStatus("saving");
    const pages = [...dirtyRef.current];
    const rows = pages.map((page) => ({
      user_id: uid,
      note_id: startNote,
      layout: startLayout,
      page_number: page,
      revision_id: live.current.revisionId ?? null,
      data: currentPage(page),
      updated_at: metaRef.current[page]?.updatedAt ?? new Date().toISOString(),
    }));
    const sent = new Map(rows.map((r) => [r.page_number, r.updated_at]));
    try {
      const { error } = await createClient().from("annotations").upsert(rows, { onConflict: "user_id,note_id,layout,page_number" });
      if (error) throw error;
      if (scopeRef.current !== startScope) return;
      for (const page of pages) {
        // A newer edit during the upload stays dirty.
        if (metaRef.current[page]?.updatedAt !== sent.get(page)) continue;
        dirtyRef.current.delete(page);
        metaRef.current[page] = { ...metaRef.current[page], synced: true };
      }
      saveMeta(localStorage, startLayout, startNote, metaRef.current);
      setStatus(dirtyRef.current.size ? "saving" : "saved");
      if (dirtyRef.current.size) timerRef.current = setTimeout(() => void flushRef.current(), SAVE_DELAY_MS);
    } catch (err) {
      console.warn("Annotation sync failed:", err);
      if (scopeRef.current === startScope) setStatus("error");
    } finally {
      flushingRef.current = false;
    }
  }, [layout, noteId]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const schedule = useCallback(
    (delay = SAVE_DELAY_MS) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), delay);
    },
    [flush],
  );

  const expect = (page: number, fp: string) => pendingRef.current.set(page, { fp, until: Date.now() + 1500 });

  // Hydrate: device pages first (synchronously), then merge the account copy.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const local = readLocalPages(localStorage, layout, noteId);
    metaRef.current = loadMeta(localStorage, layout, noteId);
    dirtyRef.current = new Set();
    pendingRef.current = new Map();
    const known: Record<number, string> = {};
    for (const [page, data] of Object.entries(local)) {
      known[Number(page)] = pageFingerprint(data);
      expect(Number(page), known[Number(page)]);
      live.current.applyPage(Number(page), normalizePage(data));
    }
    knownRef.current = { scope, pages: known };
    for (const [page, m] of Object.entries(metaRef.current)) if (!m.synced) dirtyRef.current.add(Number(page));
    setStatus(dirtyRef.current.size ? (userId ? "saving" : "signed-out") : userId ? "saved" : "idle");

    let cancelled = false;
    if (userId) {
      void (async () => {
        const { data, error } = await createClient()
          .from("annotations")
          .select("page_number, data, updated_at")
          .eq("user_id", userId)
          .eq("note_id", noteId)
          .eq("layout", layout);
        if (cancelled) return;
        if (error) {
          console.warn("Could not load annotations from your account:", error);
          setStatus("error");
          return;
        }
        const devicePages = readLocalPages(localStorage, layout, noteId);
        const plan = planMerge(devicePages, metaRef.current, (data ?? []) as RemotePage[]);
        for (const [key, { data: pageData, updatedAt }] of Object.entries(plan.apply)) {
          const page = Number(key);
          writeLocalPage(localStorage, layout, noteId, page, pageData);
          if (knownRef.current) knownRef.current.pages[page] = pageFingerprint(pageData);
          expect(page, pageFingerprint(pageData));
          metaRef.current[page] = { updatedAt, synced: true };
          dirtyRef.current.delete(page);
          live.current.applyPage(page, pageData);
        }
        for (const page of plan.upload) {
          metaRef.current[page] ??= { updatedAt: new Date().toISOString(), synced: false };
          dirtyRef.current.add(page);
        }
        saveMeta(localStorage, layout, noteId, metaRef.current);
        if (dirtyRef.current.size) schedule(0);
        else setStatus("saved");
      })();
    }
    return () => {
      cancelled = true;
    };
    // applyPage is read through `live`; re-run only for a new note, layout or user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, userId]);

  // Detect edits: any page whose content differs from what is known.
  useEffect(() => {
    const known = knownRef.current;
    if (!known || known.scope !== scope) return;
    const pages = new Set<number>([
      ...Object.keys(strokes).map(Number),
      ...Object.keys(shapes).map(Number),
      ...Object.keys(textBoxes).map(Number),
      ...Object.keys(known.pages).map(Number),
    ]);
    let changed = false;
    for (const page of pages) {
      const data = currentPage(page);
      const fp = pageFingerprint(data);
      const pending = pendingRef.current.get(page);
      if (pending) {
        if (fp === pending.fp || Date.now() > pending.until) pendingRef.current.delete(page);
        if (fp !== pending.fp && Date.now() <= pending.until) continue; // not on screen yet
      }
      if (fp === (known.pages[page] ?? pageFingerprint(null))) continue;
      if (known.pages[page] === undefined && isEmptyPage(data)) continue;
      known.pages[page] = fp;
      metaRef.current[page] = { updatedAt: new Date().toISOString(), synced: false };
      dirtyRef.current.add(page);
      changed = true;
    }
    if (!changed) return;
    saveMeta(localStorage, layout, noteId, metaRef.current);
    setStatus(userId ? "saving" : "signed-out");
    if (userId) schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes, shapes, textBoxes]);

  // Retry when the connection returns; save pending pages when leaving the note.
  useEffect(() => {
    const retry = () => {
      if (dirtyRef.current.size) schedule(0);
    };
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener("online", retry);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        void flush();
      }
    };
  }, [flush, schedule]);

  return { status, retry: () => schedule(0) };
}
