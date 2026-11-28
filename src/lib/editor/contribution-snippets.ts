/**
 * Contribution section snippets (design D9): Case Study, My Experience and
 * Findings. Each section carries a `data-section-id` (so later edits diff as
 * "changed", not remove + add) and the contributor's id and display name (so
 * the reader can show "Contributed by …"). The contributor attributes can be
 * edited in the HTML; the reviewer sees them in the diff and merge_suggestion
 * rewrites them for sections a suggestion adds.
 */

export type ContributionKind = "case-study" | "experience" | "findings";

export interface Contributor {
  id: string;
  name: string;
}

export const CONTRIBUTION_LABELS: Record<ContributionKind, string> = {
  "case-study": "Case Study",
  experience: "My Experience",
  findings: "Findings",
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function newSectionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const BODIES: Record<ContributionKind, string> = {
  "case-study": [
    "  <p><strong>Context:</strong> Describe the situation or problem.</p>",
    "  <p><strong>What happened:</strong> Describe what you did and what happened.</p>",
    "  <p><strong>Findings:</strong> What did you learn from it?</p>",
  ].join("\n"),
  experience: "  <p>Describe your own experience with this topic: what worked, what didn't, and why.</p>",
  findings: [
    "  <ul>",
    "    <li>First finding, with the evidence behind it.</li>",
    "    <li>Second finding.</li>",
    "  </ul>",
  ].join("\n"),
};

/** Builds a contribution section ready to insert into the note's HTML. */
export function contributionSnippet(
  kind: ContributionKind,
  contributor?: Contributor | null,
  sectionId: string = newSectionId(),
): string {
  const attrs = [
    `class="vl-contribution vl-${kind}"`,
    `data-section-id="${escapeAttr(sectionId)}"`,
    contributor ? `data-contributor-id="${escapeAttr(contributor.id)}"` : "",
    contributor ? `data-contributor-name="${escapeAttr(contributor.name)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<section ${attrs}>\n  <h3>${CONTRIBUTION_LABELS[kind]}</h3>\n${BODIES[kind]}\n</section>\n`;
}

/** Builds an image figure for an optimized data URL. */
export function imageSnippet(src: string, fileName: string): string {
  const alt = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim() || "Image";
  return `<figure class="vl-figure">\n  <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />\n  <figcaption>Caption</figcaption>\n</figure>\n`;
}
