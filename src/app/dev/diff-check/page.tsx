"use client";

/**
 * Dev-only harness for HtmlDiffViewer: a sample base version against a
 * suggestion that changes a paragraph, adds a case study and removes a
 * section. Not available in production builds.
 */

import { notFound } from "next/navigation";
import { HtmlDiffViewer } from "@/components/diff/html-diff-viewer";
import { SAMPLE_HTML } from "../sample-note";

const PROPOSED = SAMPLE_HTML.replace(
  "<h2>Learning rate schedules</h2>",
  "<h2>Learning rate schedules</h2>\n<p>Schedules matter most late in training, when a smaller step settles into a sharper minimum.</p>",
)
  .replace("too large and the updates overshoot the minimum", "too large and the updates bounce around the minimum")
  .replace(/<h3>Section 8<\/h3><p>[\s\S]*?<\/p><p>[\s\S]*?<\/p>/, "")
  .concat(`
<section class="vl-contribution" data-section-id="cs-1">
  <h3>Case Study</h3>
  <p><strong>Context:</strong> Fine-tuning a vision model on 2k images.</p>
  <p><strong>What happened:</strong> Loss diverged after epoch 3 with a constant rate.</p>
  <p><strong>Findings:</strong> Cosine decay with warmup fixed it.</p>
</section>`);

export default function DiffCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto max-w-5xl p-4">
      <HtmlDiffViewer baseHtml={SAMPLE_HTML} proposedHtml={PROPOSED} baseLabel="v3" proposedLabel="Suggestion" />
    </main>
  );
}
