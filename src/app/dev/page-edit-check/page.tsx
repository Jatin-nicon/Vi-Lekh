"use client";

/**
 * Dev-only harness: suggest mode's Page view without sign-in or a database.
 * `?doc=<url>` loads a complete HTML document (for example a lesson copied
 * into public/ locally) instead of the A4 sample. The current draft is shown
 * below for checking. Not available in production builds.
 */

import { Suspense, useEffect, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { PageEditor } from "@/components/editor/page-editor";
import { ReviewChanges } from "@/components/editor/review-changes";
import { LeaveCommentDialog } from "@/components/reader/note-comments";
import type { CommentAnchor } from "@/lib/data/comments";
import { SAMPLE_HTML } from "../sample-note";

export default function PageEditCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Harness />
    </Suspense>
  );
}

function Harness() {
  const params = useSearchParams();
  const doc = params.get("doc");
  const [html, setHtml] = useState<string | null>(doc ? null : SAMPLE_HTML.trim());
  const [original, setOriginal] = useState<string | null>(html);
  const [review, setReview] = useState(false);
  const [continued, setContinued] = useState(false);
  const [commentOn, setCommentOn] = useState<CommentAnchor | null>(null);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!doc) return;
    void fetch(doc)
      .then((r) => r.text())
      .then((t) => {
        setHtml(t);
        setOriginal(t);
      });
  }, [doc]);
  if (html === null) return <main className="p-20 text-sm">Loading…</main>;
  return (
    <main className="max-w-5xl mx-auto p-4 pt-20 space-y-4">
      <PageEditor html={html} onChange={setHtml} contributor={{ id: "dev-user", name: "Asha Rao" }} onUneditable={setCommentOn} />
      {commentOn && (
        <LeaveCommentDialog
          noteId="dev-note"
          revisionId="dev-rev-1"
          authorId="dev-user"
          anchor={commentOn}
          onClose={() => setCommentOn(null)}
          onSent={() => {
            setCommentOn(null);
            setSent(true);
          }}
        />
      )}
      <output id="dev-comment-sent">{String(sent)}</output>
      <button type="button" id="dev-review" onClick={() => setReview(true)} className="px-3 py-1 border rounded">
        Review changes
      </button>
      <output id="dev-continued">{String(continued)}</output>
      {review && (
        <ReviewChanges
          baseHtml={original ?? ""}
          draftHtml={html}
          baseLabel="version 3"
          onBack={() => setReview(false)}
          onContinue={() => {
            setReview(false);
            setContinued(true);
          }}
        />
      )}
      <textarea id="dev-draft" readOnly value={html} className="w-full h-40 text-[10px] font-mono" />
      <output id="dev-changed">{String(html !== original)}</output>
      <input type="hidden" id="dev-original" value={original ?? ""} />
    </main>
  );
}
