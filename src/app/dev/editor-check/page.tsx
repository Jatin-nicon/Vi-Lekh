"use client";

/**
 * Dev-only harness: the HTML note editor next to its paged live preview,
 * without sign-in or a database. Not available in production builds.
 */

import { useState } from "react";
import { notFound } from "next/navigation";
import { HtmlNoteEditor } from "@/components/editor/html-note-editor";
import { LivePreview } from "@/components/editor/live-preview";
import { SAMPLE_HTML } from "../sample-note";

export default function EditorCheckPage() {
  const [html, setHtml] = useState(SAMPLE_HTML.trim());
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="grid gap-4 p-4 pt-20 lg:grid-cols-2">
      <HtmlNoteEditor value={html} onChange={setHtml} contributor={{ id: "dev-user", name: "Asha Rao" }} />
      <LivePreview html={html} noteTitle="Dev sample" />
    </main>
  );
}
