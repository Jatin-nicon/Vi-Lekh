import { createClient } from "@/lib/supabase/client";

/**
 * Suggested edits (note-contributions spec, design D5/D6). Drafts and
 * submissions live in `note_suggestions`; every status change that needs
 * authority (submit, withdraw, merge, fork, reject, request changes) goes
 * through a database function that checks who is calling.
 */

export type SuggestionStatus = "draft" | "pending" | "changes_requested" | "merged" | "forked" | "rejected";

export interface Suggestion {
  id: string;
  note_id: string;
  author_id: string;
  base_revision_id: string | null;
  html: string;
  attached_annotations: unknown[] | null;
  summary: string;
  status: SuggestionStatus;
  reviewer_feedback: string | null;
  result_revision_id: string | null;
  forked_note_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
}

export interface SuggestionWithContext extends Suggestion {
  note: { id: string; title: string; course_id: string; current_revision_id: string | null } | null;
  author: { display_name: string } | null;
  base: { version_number: number | null } | null;
}

const WITH_CONTEXT =
  "*, note:notes!note_suggestions_note_id_fkey(id, title, course_id, current_revision_id), " +
  "author:profiles!note_suggestions_author_id_fkey(display_name), " +
  "base:revisions!note_suggestions_base_revision_id_fkey(version_number)";

export const STATUS_LABEL: Record<SuggestionStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  changes_requested: "Changes requested",
  merged: "Merged",
  forked: "Saved as copy",
  rejected: "Rejected",
};

export const SUMMARY_MAX = 200;

/** The user's open draft for a note (draft or changes requested), if any. */
export async function getOpenDraft(noteId: string, userId: string): Promise<Suggestion | null> {
  const { data, error } = await createClient()
    .from("note_suggestions")
    .select("*")
    .eq("note_id", noteId)
    .eq("author_id", userId)
    .in("status", ["draft", "changes_requested"])
    .maybeSingle();
  if (error) throw error;
  return data as Suggestion | null;
}

/** Resumes the open draft, or starts one from the given published version. */
export async function getOrCreateDraft(noteId: string, userId: string, baseRevisionId: string, html: string): Promise<Suggestion> {
  const existing = await getOpenDraft(noteId, userId);
  if (existing) return existing;
  const { data, error } = await createClient()
    .from("note_suggestions")
    .insert({ note_id: noteId, author_id: userId, base_revision_id: baseRevisionId, html, summary: "" })
    .select("*")
    .single();
  if (error) {
    // Another tab or request created the draft first (one open draft per note): use that one.
    if ((error as { code?: string }).code === "23505") {
      const created = await getOpenDraft(noteId, userId);
      if (created) return created;
    }
    throw error;
  }
  return data as Suggestion;
}

export async function saveDraft(id: string, html: string, summary?: string): Promise<void> {
  const update: { html: string; summary?: string } = { html };
  if (summary !== undefined) update.summary = summary.slice(0, SUMMARY_MAX);
  const { error } = await createClient().from("note_suggestions").update(update).eq("id", id);
  if (error) throw error;
}

export async function discardDraft(id: string): Promise<void> {
  const { error } = await createClient().from("note_suggestions").delete().eq("id", id);
  if (error) throw error;
}

export async function submitSuggestion(id: string, summary: string, includeAnnotations: boolean): Promise<Suggestion> {
  const { data, error } = await createClient().rpc("submit_suggestion", {
    p_id: id,
    p_summary: summary.trim().slice(0, SUMMARY_MAX),
    p_include_annotations: includeAnnotations,
  });
  if (error) throw error;
  return data as Suggestion;
}

export async function withdrawSuggestion(id: string): Promise<Suggestion> {
  const { data, error } = await createClient().rpc("withdraw_suggestion", { p_id: id });
  if (error) throw error;
  return data as Suggestion;
}

/** The signed-in user's suggestions, newest first. */
export async function getMySuggestions(userId: string): Promise<SuggestionWithContext[]> {
  const { data, error } = await createClient()
    .from("note_suggestions")
    .select(WITH_CONTEXT)
    .eq("author_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SuggestionWithContext[];
}

/** Pending suggestions the user may review (row-level security limits them to their courses), newest first. */
export async function getReviewQueue(): Promise<SuggestionWithContext[]> {
  const { data, error } = await createClient()
    .from("note_suggestions")
    .select(WITH_CONTEXT)
    .eq("status", "pending")
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SuggestionWithContext[];
}

export async function getSuggestion(id: string): Promise<SuggestionWithContext | null> {
  const { data, error } = await createClient().from("note_suggestions").select(WITH_CONTEXT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as SuggestionWithContext | null;
}

/** True when the note has a newer version than the one the suggestion started from. */
export function isOutdated(s: SuggestionWithContext): boolean {
  return Boolean(s.note && s.base_revision_id && s.note.current_revision_id !== s.base_revision_id);
}

export async function mergeSuggestion(
  id: string,
  mergedHtml: string,
  expectedCurrentRevisionId: string | null,
  publishAnnotations: boolean,
): Promise<{ id: string; version_number: number }> {
  const { data, error } = await createClient().rpc("merge_suggestion", {
    p_id: id,
    p_merged_html: mergedHtml,
    p_expected_current: expectedCurrentRevisionId,
    p_publish_annotations: publishAnnotations,
  });
  if (error) throw error;
  return data as { id: string; version_number: number };
}

export async function forkSuggestion(id: string, title: string): Promise<{ id: string; course_id: string }> {
  const { data, error } = await createClient().rpc("fork_suggestion", { p_id: id, p_title: title.trim() });
  if (error) throw error;
  return data as { id: string; course_id: string };
}

export async function reviewSuggestion(id: string, action: "reject" | "request_changes", feedback: string): Promise<Suggestion> {
  const { data, error } = await createClient().rpc("review_suggestion", {
    p_id: id,
    p_action: action,
    p_feedback: feedback.trim(),
  });
  if (error) throw error;
  return data as Suggestion;
}

/** Copies of a note made from suggestions, and the note a copy came from. */
export async function getRelatedCopies(noteId: string, forkedFromNoteId?: string | null) {
  const supabase = createClient();
  const [copies, original] = await Promise.all([
    supabase.from("notes").select("id, title, course_id").eq("forked_from_note_id", noteId),
    forkedFromNoteId
      ? supabase.from("notes").select("id, title, course_id").eq("id", forkedFromNoteId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  return {
    copies: (copies.data ?? []) as { id: string; title: string; course_id: string }[],
    original: (original.data ?? null) as { id: string; title: string; course_id: string } | null,
  };
}

/** A readable message from a Supabase error or Error. */
export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  const m = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  return m || fallback;
}
