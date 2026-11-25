"use client";

/**
 * Dev-only harness: renders the real NoteReader with a sample note (HTML
 * content plus the bundled sample PDF) so the paged HTML view, annotations
 * and the PDF/Web switcher can be checked without a database.
 * Not available in production builds.
 */

import { notFound } from "next/navigation";
import { NoteReader } from "@/components/reader/note-reader";
import { htmlToBlocks } from "@/lib/editor/block-converter";
import type { Note, Revision } from "@/lib/supabase/types";
import { SAMPLE_HTML } from "../sample-note";

const NOW = "2026-11-21T00:00:00.000Z";

const NOTE: Note = {
  id: "dev-reader-check",
  course_id: "dev-course",
  slug: "dev-reader-check",
  title: "Optimization Basics (dev sample)",
  current_revision_id: "dev-rev-1",
  pdf_url: "/sample-lecture.pdf",
  created_by: "dev",
  created_at: NOW,
  updated_at: NOW,
};

const REVISION: Revision = {
  id: "dev-rev-1",
  note_id: NOTE.id,
  author_id: "dev",
  blocks: htmlToBlocks(SAMPLE_HTML),
  pdf_url: "/sample-lecture.pdf",
  change_summary: "Sample",
  status: "approved",
  created_at: NOW,
  updated_at: NOW,
};

export default function ReaderCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <NoteReader note={NOTE} revision={REVISION} courseTitle="Dev course" />;
}
