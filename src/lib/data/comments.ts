import { createClient } from "@/lib/supabase/client";

/**
 * Comments on notes (note-comments spec, design D6). A thread is its first
 * comment plus the replies pointing at it. Row-level security keeps a thread
 * private to the person who started it and the note's reviewers; resolving
 * goes through `set_comment_resolved`, which checks who is calling.
 */

export const COMMENT_MAX = 2000;

/** Where a thread points in the note (design D7). */
export interface CommentAnchor {
  quote: string;
  prefix?: string;
  suffix?: string;
  /** Child-index path of the block, as a hint (design D2). */
  path?: number[];
}

export interface NoteComment {
  id: string;
  note_id: string;
  thread_id: string | null;
  author_id: string;
  revision_id: string | null;
  anchor: CommentAnchor | null;
  body: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  author: { display_name: string } | null;
}

export interface CommentThread extends NoteComment {
  replies: NoteComment[];
}

export interface OpenThread extends NoteComment {
  note: { id: string; title: string; course_id: string } | null;
  reply_count: number;
}

const FIELDS = "*, author:profiles!note_comments_author_id_fkey(display_name)";

/** Trims a comment and checks its length; throws a message fit to show. */
export function cleanBody(body: string): string {
  const text = body.trim();
  if (!text) throw new Error("Write a comment first.");
  if (text.length > COMMENT_MAX) throw new Error(`Comments can be up to ${COMMENT_MAX} characters.`);
  return text;
}

/** Groups comments (oldest first) into threads, newest thread first, replies oldest first. */
export function groupThreads(rows: NoteComment[]): CommentThread[] {
  const threads = new Map<string, CommentThread>();
  for (const r of rows) if (!r.thread_id) threads.set(r.id, { ...r, replies: [] });
  for (const r of rows) if (r.thread_id) threads.get(r.thread_id)?.replies.push(r);
  for (const t of threads.values()) t.replies.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return [...threads.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** The threads on a note that the user can see. */
export async function listThreads(noteId: string): Promise<CommentThread[]> {
  const { data, error } = await createClient()
    .from("note_comments")
    .select(FIELDS)
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return groupThreads((data ?? []) as NoteComment[]);
}

/** Starts a thread on a published version of a note. */
export async function addComment(input: {
  noteId: string;
  authorId: string;
  revisionId: string;
  anchor: CommentAnchor | null;
  body: string;
}): Promise<NoteComment> {
  const { data, error } = await createClient()
    .from("note_comments")
    .insert({
      note_id: input.noteId,
      author_id: input.authorId,
      revision_id: input.revisionId,
      anchor: input.anchor,
      body: cleanBody(input.body),
    })
    .select(FIELDS)
    .single();
  if (error) throw error;
  return data as NoteComment;
}

/** Replies in a thread (its author or a reviewer). */
export async function replyToComment(input: { noteId: string; threadId: string; authorId: string; body: string }): Promise<NoteComment> {
  const { data, error } = await createClient()
    .from("note_comments")
    .insert({ note_id: input.noteId, thread_id: input.threadId, author_id: input.authorId, body: cleanBody(input.body) })
    .select(FIELDS)
    .single();
  if (error) throw error;
  return data as NoteComment;
}

/** Changes the text of the user's own comment. */
export async function editComment(id: string, body: string): Promise<NoteComment> {
  const { data, error } = await createClient()
    .from("note_comments")
    .update({ body: cleanBody(body) })
    .eq("id", id)
    .select(FIELDS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("You can only edit your own comments.");
  return data as NoteComment;
}

/** Deletes the user's own comment; deleting a thread removes its replies. */
export async function deleteComment(id: string): Promise<void> {
  const { data, error } = await createClient().from("note_comments").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("You can only delete your own comments.");
}

/** Resolves or reopens a thread (its author or a reviewer). */
export async function setResolved(id: string, resolved: boolean): Promise<NoteComment> {
  const { data, error } = await createClient().rpc("set_comment_resolved", { p_id: id, p_resolved: resolved });
  if (error) throw error;
  return data as NoteComment;
}

/**
 * Open threads for the review area, newest first. Row-level security already
 * limits them to the reviewer's courses (and threads the user started);
 * `courseIds` narrows them to the courses the user reviews.
 */
export async function listOpenThreads(courseIds?: string[]): Promise<OpenThread[]> {
  const client = createClient();
  let query = client
    .from("note_comments")
    .select(`${FIELDS}, note:notes!note_comments_note_id_fkey!inner(id, title, course_id)`)
    .is("thread_id", null)
    .is("resolved_at", null);
  if (courseIds) query = query.in("note.course_id", courseIds);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  const threads = (data ?? []) as Omit<OpenThread, "reply_count">[];
  if (!threads.length) return [];
  const { data: replies, error: replyError } = await client
    .from("note_comments")
    .select("thread_id")
    .in("thread_id", threads.map((t) => t.id));
  if (replyError) throw replyError;
  const counts = new Map<string, number>();
  for (const r of (replies ?? []) as { thread_id: string }[]) counts.set(r.thread_id, (counts.get(r.thread_id) ?? 0) + 1);
  return threads.map((t) => ({ ...t, reply_count: counts.get(t.id) ?? 0 }));
}

/** Open threads in the courses the user reviews (not threads they started elsewhere), for the review area. */
export async function listReviewThreads(): Promise<OpenThread[]> {
  const all = await listOpenThreads();
  const courses = [...new Set(all.map((t) => t.note?.course_id).filter((id): id is string => !!id))];
  const checks = await Promise.all(
    courses.map(async (id) => {
      const { data, error } = await createClient().rpc("is_course_reviewer", { p_course_id: id });
      if (error) throw error;
      return [id, data === true] as const;
    }),
  );
  const reviewed = new Set(checks.filter(([, ok]) => ok).map(([id]) => id));
  return all.filter((t) => t.note && reviewed.has(t.note.course_id));
}
