"use client";

/**
 * Dev-only harness: a note in the paged viewer with the comments panel, for
 * checking comments without sign-in. `?uid=` acts as that user (no uid:
 * signed out), `?reviewer=1` as a course reviewer. Database calls are meant
 * to be stubbed by the test. Not available in production builds.
 */

import { Suspense, useState } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { HtmlSandboxedViewer } from "@/components/editor/html-sandboxed-viewer";
import { NoteComments } from "@/components/reader/note-comments";
import { renderMathInHtml } from "@/lib/editor/math-html";
import { SAMPLE_HTML } from "../sample-note";

export default function CommentsCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense>
      <Harness />
    </Suspense>
  );
}

function Harness() {
  const params = useSearchParams();
  const uid = params.get("uid");
  const [open, setOpen] = useState(params.get("open") === "1");
  const [count, setCount] = useState(0);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [html] = useState(() => renderMathInHtml(SAMPLE_HTML));
  return (
    <main className="max-w-5xl mx-auto p-4 pt-20 space-y-3">
      <button type="button" id="dev-comments" onClick={() => setOpen((o) => !o)} className="px-3 py-1 border rounded text-xs">
        Comments{count ? ` (${count})` : ""}
      </button>
      <div className="rounded-2xl bg-[#EFEBE3] p-2 sm:p-6">
        <HtmlSandboxedViewer html={html} paged onContentRoot={setRoot} />
      </div>
      <NoteComments
        noteId="dev-note"
        revisionId="dev-rev-1"
        root={root}
        user={uid ? { id: uid, name: uid } : null}
        isReviewer={params.get("reviewer") === "1"}
        canComment
        open={open}
        onOpenChange={setOpen}
        onSignIn={async () => {
          document.body.dataset.signInAsked = "1";
        }}
        onCount={setCount}
        focusId={params.get("comment")}
      />
    </main>
  );
}
