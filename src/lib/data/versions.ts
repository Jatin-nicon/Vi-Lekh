import { createClient } from "@/lib/supabase/client";
import type { NoteBlock } from "@/lib/supabase/types";

/**
 * Published versions of a note (note-version-history spec). Every publish is
 * a new, unchangeable row in `revisions` with its own version number;
 * restoring publishes the old content again as a new version.
 */

export type VersionSource = "edit" | "suggestion" | "restore" | "fork" | "legacy";

export interface VersionSummary {
  id: string;
  version_number: number;
  created_at: string;
  change_summary: string;
  source: VersionSource;
  restored_from_revision_id: string | null;
  author: { display_name: string } | null;
  merger: { display_name: string } | null;
}

export interface Version extends VersionSummary {
  note_id: string;
  blocks: NoteBlock[];
  pdf_url?: string | null;
}

const SUMMARY_FIELDS =
  "id, version_number, created_at, change_summary, source, restored_from_revision_id, " +
  "author:profiles!revisions_author_id_fkey(display_name), merger:profiles!revisions_merged_by_fkey(display_name)";

/** A note's published versions, newest first. */
export async function getVersionHistory(noteId: string): Promise<VersionSummary[]> {
  const { data, error } = await createClient()
    .from("revisions")
    .select(SUMMARY_FIELDS)
    .eq("note_id", noteId)
    .not("version_number", "is", null)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as VersionSummary[];
}

/** One published version with its content. */
export async function getVersion(revisionId: string): Promise<Version | null> {
  const { data, error } = await createClient()
    .from("revisions")
    .select(`${SUMMARY_FIELDS}, note_id, blocks, pdf_url`)
    .eq("id", revisionId)
    .not("version_number", "is", null)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Version | null;
}

/** Publishes an earlier version's content as the new current version. Reviewers only. */
export async function restoreVersion(revisionId: string): Promise<{ id: string; version_number: number }> {
  const { data, error } = await createClient().rpc("restore_version", { p_revision_id: revisionId });
  if (error) throw error;
  return data as { id: string; version_number: number };
}

/** How a version came about, as shown in the history list. */
export function describeSource(v: VersionSummary, numberById: Map<string, number>): string {
  switch (v.source) {
    case "edit":
      return "Direct edit";
    case "suggestion":
      return "Merged suggestion";
    case "restore": {
      const from = v.restored_from_revision_id ? numberById.get(v.restored_from_revision_id) : undefined;
      return from ? `Restored from v${from}` : "Restored";
    }
    case "fork":
      return "Created as a copy";
    default:
      return "Published";
  }
}

/** Reads and writes the `version` query parameter without reloading the page. */
export function versionParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("version");
}

export function setVersionParam(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("version", id);
  else url.searchParams.delete("version");
  window.history.replaceState(window.history.state, "", url);
}
