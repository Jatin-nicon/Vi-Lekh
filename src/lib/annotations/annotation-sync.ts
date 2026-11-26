/**
 * Account sync for annotations (design D10). The browser copy in localStorage
 * stays the working copy and offline cache; each page is also saved to the
 * `annotations` table. Pages merge by their own `updatedAt`: the newer copy
 * of a page wins.
 */

import type { AnnotationShape, AnnotationStroke, AnnotationTextBox } from "@/components/reader/annotation-layer";
import { ANNOTATION_KINDS, annotationStorageKey, type AnnotationLayout } from "./storage-keys";

export interface PageAnnotations {
  strokes: AnnotationStroke[];
  shapes: AnnotationShape[];
  textBoxes: AnnotationTextBox[];
}

/** Sync state of one page on this device. */
export interface PageSyncMeta {
  /** When this page last changed (ISO time). */
  updatedAt: string;
  /** True once this version of the page is saved to the account. */
  synced: boolean;
}

export type SyncMeta = Record<number, PageSyncMeta>;

export interface RemotePage {
  page_number: number;
  data: Partial<PageAnnotations> | null;
  updated_at: string;
}

export const EMPTY_PAGE: PageAnnotations = { strokes: [], shapes: [], textBoxes: [] };

export function syncMetaKey(layout: AnnotationLayout, noteId: string): string {
  return `vilekh_sync_${layout}_${noteId}`;
}

/** Fills in missing lists and the text box width the layer defaults to. */
export function normalizePage(data: Partial<PageAnnotations> | null | undefined): PageAnnotations {
  return {
    strokes: Array.isArray(data?.strokes) ? data.strokes : [],
    shapes: Array.isArray(data?.shapes) ? data.shapes : [],
    textBoxes: Array.isArray(data?.textBoxes) ? data.textBoxes.map((b) => ({ ...b, width: b.width || 240 })) : [],
  };
}

/** Comparable form of a page; equal strings mean equal content. */
export function pageFingerprint(data: Partial<PageAnnotations> | null | undefined): string {
  return JSON.stringify(normalizePage(data));
}

export function isEmptyPage(data: Partial<PageAnnotations> | null | undefined): boolean {
  const p = normalizePage(data);
  return p.strokes.length + p.shapes.length + p.textBoxes.length === 0;
}

const KIND_FIELD = { annotations: "strokes", shapes: "shapes", textboxes: "textBoxes" } as const;

/** Every page of a note and layout saved in this browser. */
export function readLocalPages(storage: Storage, layout: AnnotationLayout, noteId: string): Record<number, PageAnnotations> {
  const pages: Record<number, PageAnnotations> = {};
  const prefixes = ANNOTATION_KINDS.map((kind) => [kind, annotationStorageKey(layout, kind, noteId, 0).slice(0, -1)] as const);
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    for (const [kind, prefix] of prefixes) {
      if (!key.startsWith(prefix)) continue;
      const page = Number(key.slice(prefix.length));
      if (!Number.isInteger(page) || page < 1) continue;
      try {
        const value = JSON.parse(storage.getItem(key) ?? "[]");
        if (!Array.isArray(value)) continue;
        pages[page] = { ...(pages[page] ?? EMPTY_PAGE), [KIND_FIELD[kind]]: value };
      } catch {
        // Ignore unreadable entries
      }
    }
  }
  return pages;
}

export function writeLocalPage(storage: Storage, layout: AnnotationLayout, noteId: string, page: number, data: PageAnnotations) {
  for (const kind of ANNOTATION_KINDS) {
    const key = annotationStorageKey(layout, kind, noteId, page);
    const value = data[KIND_FIELD[kind]];
    if (value.length) storage.setItem(key, JSON.stringify(value));
    else storage.removeItem(key);
  }
}

export function loadMeta(storage: Storage, layout: AnnotationLayout, noteId: string): SyncMeta {
  try {
    const parsed = JSON.parse(storage.getItem(syncMetaKey(layout, noteId)) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as SyncMeta) : {};
  } catch {
    return {};
  }
}

export function saveMeta(storage: Storage, layout: AnnotationLayout, noteId: string, meta: SyncMeta) {
  try {
    storage.setItem(syncMetaKey(layout, noteId), JSON.stringify(meta));
  } catch {
    // Ignore storage errors (e.g. quota)
  }
}

export interface MergePlan {
  /** Account copies that are newer than this device's: apply them here. */
  apply: Record<number, { data: PageAnnotations; updatedAt: string }>;
  /** Pages whose device copy must be uploaded. */
  upload: number[];
}

/**
 * Decides, per page, which copy wins. Device pages without sync metadata
 * (made before account sync, or signed out) count as unsynced edits.
 */
export function planMerge(local: Record<number, PageAnnotations>, meta: SyncMeta, remote: RemotePage[]): MergePlan {
  const plan: MergePlan = { apply: {}, upload: [] };
  const remoteByPage = new Map(remote.map((r) => [r.page_number, r]));
  const pages = new Set<number>([...Object.keys(local).map(Number), ...Object.keys(meta).map(Number), ...remoteByPage.keys()]);
  for (const page of [...pages].sort((a, b) => a - b)) {
    const r = remoteByPage.get(page);
    const m = meta[page];
    const hasLocal = Boolean(local[page]) && !isEmptyPage(local[page]);
    const localTime = m ? Date.parse(m.updatedAt) : hasLocal ? 0 : -Infinity;
    const remoteTime = r ? Date.parse(r.updated_at) : -Infinity;
    if (r && remoteTime > localTime) {
      const data = normalizePage(r.data);
      if (pageFingerprint(data) !== pageFingerprint(local[page])) plan.apply[page] = { data, updatedAt: r.updated_at };
    } else if ((m && !m.synced) || (!m && hasLocal)) {
      if (!r || pageFingerprint(r.data) !== pageFingerprint(local[page])) plan.upload.push(page);
    }
  }
  return plan;
}
