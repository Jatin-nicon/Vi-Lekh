"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Loader2, MessageSquarePlus, MessageSquareText, MousePointerClick, RotateCcw, X } from "lucide-react";
import {
  addComment,
  COMMENT_MAX,
  deleteComment,
  editComment,
  listThreads,
  replyToComment,
  setResolved,
  type CommentAnchor,
  type CommentThread,
  type NoteComment,
} from "@/lib/data/comments";
import { blockAnchor, buildAnchor, clearHighlights, COMMENT_MARK_CSS, findAnchor, highlight, MARK_ATTR, shadowSelection } from "@/lib/editor/comment-anchor";
import { findBlock } from "@/lib/editor/page-editing";
import { formatDate } from "@/lib/utils";

const STYLE_ID = "vl-comment-style";
const PICK_ATTR = "data-vl-pick-hover";
const PICK_CSS = `[${PICK_ATTR}] { outline: 2px dashed #2563EB; outline-offset: 2px; cursor: pointer; }`;

function addStyle(root: HTMLElement) {
  const shadow = root.getRootNode();
  if (!(shadow instanceof ShadowRoot) || shadow.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = COMMENT_MARK_CSS + PICK_CSS;
  shadow.appendChild(style);
}

const errorText = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : fallback;

const noop = () => () => {};

export interface CommentUser {
  id: string;
  name: string;
}

/**
 * Comments on a note (design D7, D8): a "Comment" button next to selected
 * text, a block picker, and a side panel with the user's threads (or all
 * threads, for the course's reviewers). Highlights live in the rendered page
 * only.
 */
export function NoteComments({
  noteId,
  revisionId,
  root,
  user,
  isReviewer,
  canComment,
  open,
  onOpenChange,
  onSignIn,
  onCount,
  focusId,
}: {
  noteId: string;
  /** The published version new comments are made on. */
  revisionId: string | null;
  /** The rendered note (inside the viewer's shadow root). */
  root: HTMLElement | null;
  user: CommentUser | null;
  isReviewer: boolean;
  /** False while an earlier version is open: comments are made on the current one. */
  canComment: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn: () => Promise<void>;
  onCount?: (open: number) => void;
  /** A thread to show and scroll to once the note and comments are loaded. */
  focusId?: string | null;
}) {
  const [threads, setThreads] = useState<CommentThread[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<{ anchor: CommentAnchor } | null>(null);
  const [selection, setSelection] = useState<{ anchor: CommentAnchor; top: number; left: number } | null>(null);
  const [picking, setPicking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const userId = user?.id ?? null;
  // Portals need the document, which the server doesn't have.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      setThreads(await listThreads(noteId));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorText(err, "Comments could not be loaded."));
    }
  }, [noteId, userId]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      queueMicrotask(() => !cancelled && setThreads([]));
      return;
    }
    listThreads(noteId)
      .then((t) => !cancelled && (setThreads(t), setLoadError(null)))
      .catch((err) => !cancelled && setLoadError(errorText(err, "Comments could not be loaded.")));
    return () => {
      cancelled = true;
    };
  }, [noteId, userId]);

  const openThreads = useMemo(() => (threads ?? []).filter((t) => !t.resolved_at), [threads]);
  useEffect(() => onCount?.(openThreads.length), [openThreads.length, onCount]);

  // Highlight open threads on the page; note which can't be found any more.
  useEffect(() => {
    if (!root) return;
    addStyle(root);
    clearHighlights(root);
    const gone = new Set<string>();
    for (const t of openThreads) {
      const range = t.anchor ? findAnchor(root, t.anchor) : null;
      if (range) highlight(range, t.id);
      else if (t.anchor) gone.add(t.id);
    }
    let cancelled = false;
    queueMicrotask(() => !cancelled && setMissing(gone));
    return () => {
      cancelled = true;
      clearHighlights(root);
    };
  }, [root, openThreads]);

  // The active thread's marks stand out.
  useEffect(() => {
    if (!root) return;
    root.querySelectorAll(`mark[${MARK_ATTR}]`).forEach((m) => m.toggleAttribute("data-vl-active", m.getAttribute(MARK_ATTR) === activeId));
  }, [root, activeId, openThreads]);

  const jumpTo = useCallback(
    (id: string) => {
      setActiveId(id);
      const mark = root?.querySelector(`mark[${MARK_ATTR}="${CSS.escape(id)}"]`);
      mark?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [root],
  );

  // Show the thread a link pointed at, once, when it and the page are ready.
  const focused = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || focused.current === focusId || !root || !threads?.some((t) => t.id === focusId)) return;
    const t = setTimeout(() => {
      focused.current = focusId;
      jumpTo(focusId);
    }, 300);
    return () => clearTimeout(t);
  }, [focusId, root, threads, jumpTo]);

  // A "Comment" button next to selected text; clicking a highlight opens its thread.
  useEffect(() => {
    if (!root) return;
    const shadow = root.getRootNode();
    if (!(shadow instanceof ShadowRoot)) return;
    const check = () => {
      const range = canComment ? shadowSelection(shadow) : null;
      if (!range || !root.contains(range.commonAncestorContainer)) return setSelection(null);
      const anchor = buildAnchor(range, root);
      const rect = range.getBoundingClientRect();
      if (!anchor || (!rect.width && !rect.height)) return setSelection(null);
      setSelection({ anchor, top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    };
    const onUp = () => requestAnimationFrame(check);
    const onSelectionChange = () => {
      if (document.getSelection()?.isCollapsed) setSelection(null);
    };
    const onClick = (e: MouseEvent) => {
      const mark = (e.target as Element).closest?.(`mark[${MARK_ATTR}]`);
      if (!mark || !document.getSelection()?.isCollapsed) return;
      onOpenChange(true);
      setActiveId(mark.getAttribute(MARK_ATTR));
    };
    const hide = () => setSelection(null);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("keyup", onUp);
    root.addEventListener("click", onClick);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", hide, true);
    return () => {
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("keyup", onUp);
      root.removeEventListener("click", onClick);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", hide, true);
    };
  }, [root, canComment, onOpenChange]);

  // Block picker: the next click on a block starts a comment on it.
  useEffect(() => {
    if (!root || !picking) return;
    let hovered: Element | null = null;
    const blockAt = (t: EventTarget | null) => {
      const hit = findBlock(t as Element, root);
      return hit.kind === "none" ? null : hit.element;
    };
    const over = (e: PointerEvent) => {
      const b = blockAt(e.target);
      if (b === hovered) return;
      hovered?.removeAttribute(PICK_ATTR);
      hovered = b;
      hovered?.setAttribute(PICK_ATTR, "");
    };
    const click = (e: MouseEvent) => {
      const b = blockAt(e.target);
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      const anchor = blockAnchor(b, root);
      setPicking(false);
      if (anchor) setDraft({ anchor });
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setPicking(false);
    root.addEventListener("pointerover", over);
    root.addEventListener("click", click, true);
    window.addEventListener("keydown", key);
    return () => {
      hovered?.removeAttribute(PICK_ATTR);
      root.removeEventListener("pointerover", over);
      root.removeEventListener("click", click, true);
      window.removeEventListener("keydown", key);
    };
  }, [root, picking]);

  const startFromSelection = () => {
    if (!selection) return;
    setDraft({ anchor: selection.anchor });
    setSelection(null);
    onOpenChange(true);
  };

  const run = async (action: () => Promise<unknown>) => {
    await action();
    await reload();
  };

  return (
    <>
      {mounted &&
        selection &&
        createPortal(
          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={startFromSelection}
            style={{ top: selection.top, left: selection.left }}
            className="print:hidden fixed z-[95] -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-lg cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" /> Comment
          </button>,
          document.body,
        )}
      {mounted &&
        open &&
        createPortal(
          <aside
            role="complementary"
            aria-label="Comments"
            className="print:hidden fixed right-0 top-0 z-[94] h-full w-full max-w-sm bg-[#FAF8F5] dark:bg-[#21201E] border-l border-[#E8E3D9] dark:border-[#33312E] shadow-2xl flex flex-col text-[#2D2926] dark:text-[#E3DFD7]"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#E8E3D9] dark:border-[#33312E]">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareText className="w-4 h-4 text-[#A85D44]" /> Comments
                {openThreads.length > 0 && <span className="text-xs font-medium text-[#757069]">({openThreads.length} open)</span>}
              </h2>
              <button type="button" onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-[#EFEBE3] dark:hover:bg-[#2B2A27] cursor-pointer" aria-label="Close comments">
                <X className="w-4 h-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {!user ? (
                <SignInPrompt onSignIn={onSignIn} />
              ) : (
                <>
                  <p className="text-[#757069] dark:text-[#948F86]">
                    {isReviewer
                      ? "You see every comment on this note as a reviewer."
                      : "Only you and the course's reviewers see your comments."}
                  </p>
                  {draft ? (
                    <CommentForm
                      quote={draft.anchor.quote}
                      onCancel={() => setDraft(null)}
                      onSubmit={async (body) => {
                        if (!revisionId) throw new Error("This note has no published version to comment on.");
                        const made = await addComment({ noteId, authorId: user.id, revisionId, anchor: draft.anchor, body });
                        setDraft(null);
                        await reload();
                        setActiveId(made.id);
                      }}
                    />
                  ) : canComment ? (
                    <div className="flex flex-wrap items-center gap-2 text-[#757069] dark:text-[#948F86]">
                      <span>Select text on the page and press Comment, or</span>
                      <button
                        type="button"
                        onClick={() => setPicking((p) => !p)}
                        aria-pressed={picking}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border cursor-pointer ${picking ? "border-[#2563EB] text-[#2563EB]" : "border-[#E8E3D9] dark:border-[#33312E]"}`}
                      >
                        <MousePointerClick className="w-3.5 h-3.5" /> {picking ? "Click a block on the page (Esc to stop)" : "Pick a block"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[#757069]">Go back to the current version to add a comment.</p>
                  )}
                  {loadError && (
                    <p className="flex gap-1.5 text-red-700 dark:text-red-400" role="alert">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {loadError}
                    </p>
                  )}
                  {threads === null ? (
                    <p className="flex items-center gap-2 text-[#757069]"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading comments…</p>
                  ) : (
                    <ThreadList
                      threads={threads}
                      missing={missing}
                      activeId={activeId}
                      user={user}
                      isReviewer={isReviewer}
                      onJump={jumpTo}
                      onReply={(t, body) => run(() => replyToComment({ noteId, threadId: t.id, authorId: user.id, body }))}
                      onEdit={(c, body) => run(() => editComment(c.id, body))}
                      onDelete={(c) => run(() => deleteComment(c.id))}
                      onResolve={(t, resolved) => run(() => setResolved(t.id, resolved))}
                    />
                  )}
                </>
              )}
            </div>
          </aside>,
          document.body,
        )}
    </>
  );
}

/**
 * "Leave a comment" from suggest mode (task 4.5): a comment on the published
 * version about a part that can't be edited on the page.
 */
export function LeaveCommentDialog({
  noteId,
  revisionId,
  authorId,
  anchor,
  onClose,
  onSent,
}: {
  noteId: string;
  revisionId: string;
  authorId: string;
  anchor: CommentAnchor;
  onClose: () => void;
  onSent: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Leave a comment"
        className="w-full max-w-md rounded-2xl bg-[#FAF8F5] dark:bg-[#21201E] border border-[#E8E3D9] dark:border-[#33312E] shadow-2xl p-4 space-y-3 text-xs text-[#2D2926] dark:text-[#E3DFD7]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquarePlus className="w-4 h-4 text-[#A85D44]" /> Leave a comment
        </h2>
        <p className="text-[#757069] dark:text-[#948F86]">
          Describe the change you&apos;d like. Only you and the course&apos;s reviewers see it, under Comments on the note.
        </p>
        <CommentForm
          quote={anchor.quote}
          onCancel={onClose}
          onSubmit={async (body) => {
            await addComment({ noteId, authorId, revisionId, anchor, body });
            onSent();
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

function SignInPrompt({ onSignIn }: { onSignIn: () => Promise<void> }) {
  return (
    <div className="p-3 rounded-xl border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] space-y-2">
      <p>Sign in to comment on this note. Your comments are seen only by you and the course&apos;s reviewers.</p>
      <button
        type="button"
        onClick={() => void onSignIn().catch(() => {})}
        className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold cursor-pointer"
      >
        Sign in
      </button>
    </div>
  );
}

/** A text box with a character limit, used for new comments, replies and edits. */
export function CommentForm({
  quote,
  initial = "",
  submitLabel = "Comment",
  placeholder = "Suggest an idea or ask a question…",
  onSubmit,
  onCancel,
}: {
  quote?: string;
  initial?: string;
  submitLabel?: string;
  placeholder?: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (quote !== undefined || initial) ref.current?.focus();
  }, [quote, initial]);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(body);
      setBody("");
    } catch (err) {
      setError(errorText(err, "That didn't save. Please try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {quote !== undefined && <Quote text={quote} />}
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={COMMENT_MAX}
        rows={3}
        placeholder={placeholder}
        aria-label={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
          if (e.key === "Escape" && onCancel) {
            e.stopPropagation();
            onCancel();
          }
        }}
        className="w-full rounded-lg border border-[#E8E3D9] dark:border-[#33312E] bg-white dark:bg-[#181716] p-2 text-xs resize-y focus:outline-none focus:border-[#2563EB]"
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`tabular-nums ${body.length >= COMMENT_MAX ? "text-red-700" : "text-[#9C978E]"}`}>
          {body.length}/{COMMENT_MAX}
        </span>
        <div className="flex gap-1.5">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-2 py-1 rounded-md border border-[#E8E3D9] dark:border-[#33312E] cursor-pointer">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold cursor-pointer disabled:cursor-default"
          >
            {busy && <Loader2 className="w-3 h-3 animate-spin" />} {submitLabel}
          </button>
        </div>
      </div>
      {error && <p className="text-red-700 dark:text-red-400" role="alert">{error}</p>}
    </form>
  );
}

function Quote({ text }: { text: string }) {
  return <blockquote className="border-l-2 border-[#CA8A04] pl-2 italic text-[#57534E] dark:text-[#B5B0A6] line-clamp-3">{text}</blockquote>;
}

function ThreadList({
  threads,
  missing,
  ...rest
}: {
  threads: CommentThread[];
  missing: Set<string>;
} & Omit<ThreadProps, "thread" | "missing">) {
  const [showResolved, setShowResolved] = useState(false);
  const open = threads.filter((t) => !t.resolved_at);
  const resolved = threads.filter((t) => t.resolved_at);
  return (
    <div className="space-y-2">
      {open.length === 0 && <p className="text-[#757069]">No open comments.</p>}
      {open.map((t) => (
        <Thread key={t.id} thread={t} missing={missing.has(t.id)} {...rest} />
      ))}
      {resolved.length > 0 && (
        <div className="pt-1">
          <button type="button" onClick={() => setShowResolved((s) => !s)} className="inline-flex items-center gap-1 font-medium text-[#757069] cursor-pointer" aria-expanded={showResolved}>
            {showResolved ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} Resolved ({resolved.length})
          </button>
          {showResolved && (
            <div className="mt-2 space-y-2">
              {resolved.map((t) => (
                <Thread key={t.id} thread={t} missing={false} {...rest} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ThreadProps {
  thread: CommentThread;
  missing: boolean;
  activeId: string | null;
  user: CommentUser;
  isReviewer: boolean;
  onJump: (id: string) => void;
  onReply: (t: CommentThread, body: string) => Promise<void>;
  onEdit: (c: NoteComment, body: string) => Promise<void>;
  onDelete: (c: NoteComment) => Promise<void>;
  onResolve: (t: CommentThread, resolved: boolean) => Promise<void>;
}

function Thread({ thread, missing, activeId, user, isReviewer, onJump, onReply, onEdit, onDelete, onResolve }: ThreadProps) {
  const canAct = isReviewer || thread.author_id === user.id;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err, "That didn't work. Please try again."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article
      aria-label={`Comment by ${thread.author?.display_name ?? "someone"}`}
      data-thread={thread.id}
      className={`p-3 rounded-xl border bg-white dark:bg-[#181716] space-y-2 ${activeId === thread.id ? "border-[#CA8A04]" : "border-[#E8E3D9] dark:border-[#33312E]"} ${thread.resolved_at ? "opacity-75" : ""}`}
    >
      {thread.anchor?.quote && (
        <button type="button" onClick={() => onJump(thread.id)} disabled={missing || !!thread.resolved_at} className="block w-full text-left cursor-pointer disabled:cursor-default" title={missing ? undefined : "Show on the page"}>
          <Quote text={thread.anchor.quote} />
        </button>
      )}
      {missing && <p className="text-[#92400E] dark:text-amber-300">Made on an earlier version: this text has changed since.</p>}
      <Comment comment={thread} user={user} onEdit={onEdit} onDelete={onDelete} />
      {thread.replies.map((r) => (
        <div key={r.id} className="pl-3 border-l border-[#E8E3D9] dark:border-[#33312E]">
          <Comment comment={r} user={user} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
      {canAct && (
        <div className="space-y-2">
          {!thread.resolved_at && <CommentForm submitLabel="Reply" placeholder="Reply…" onSubmit={(body) => onReply(thread, body)} />}
          <button
            type="button"
            disabled={busy}
            onClick={() => void act(() => onResolve(thread, !thread.resolved_at))}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E8E3D9] dark:border-[#33312E] font-medium cursor-pointer disabled:opacity-50"
          >
            {thread.resolved_at ? <RotateCcw className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {thread.resolved_at ? "Reopen" : "Resolve"}
          </button>
        </div>
      )}
      {error && <p className="text-red-700 dark:text-red-400" role="alert">{error}</p>}
    </article>
  );
}

function Comment({
  comment,
  user,
  onEdit,
  onDelete,
}: {
  comment: NoteComment;
  user: CommentUser;
  onEdit: (c: NoteComment, body: string) => Promise<void>;
  onDelete: (c: NoteComment) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const own = comment.author_id === user.id;
  const edited = comment.updated_at !== comment.created_at;
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-baseline gap-x-2 text-[11px] text-[#757069] dark:text-[#948F86]">
        <span className="font-semibold text-[#2D2926] dark:text-[#E3DFD7]">{own ? "You" : comment.author?.display_name ?? "Someone"}</span>
        <span>{formatDate(comment.created_at)}</span>
        {edited && <span>(edited)</span>}
      </p>
      {editing ? (
        <CommentForm
          initial={comment.body}
          submitLabel="Save"
          placeholder="Edit your comment"
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await onEdit(comment, body);
            setEditing(false);
          }}
        />
      ) : (
        <p className="whitespace-pre-wrap break-words">{comment.body}</p>
      )}
      {own && !editing && (
        <div className="flex gap-2 text-[11px]">
          {confirming ? (
            <>
              <span>{comment.thread_id ? "Delete this reply?" : "Delete this comment and its replies?"}</span>
              <button
                type="button"
                className="font-semibold text-red-700 dark:text-red-400 cursor-pointer"
                onClick={() => void onDelete(comment).catch((err) => setError(errorText(err, "It couldn't be deleted.")))}
              >
                Delete
              </button>
              <button type="button" className="cursor-pointer" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </>
          ) : (
            <>
              <button type="button" className="text-[#2563EB] cursor-pointer" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="text-[#2563EB] cursor-pointer" onClick={() => setConfirming(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
      {error && <p className="text-red-700 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
}
