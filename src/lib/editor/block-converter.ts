import type { NoteBlock, FlowStep, ConceptCard } from "@/lib/supabase/types";

/**
 * Converts NoteBlock[] from database into unified HTML for the Pure HTML Editor.
 * For modern notes with a single "html" block, returns the HTML directly.
 * For legacy multi-block notes, converts all legacy blocks into clean HTML elements.
 */
export function blocksToHtml(blocks: NoteBlock[]): string {
  if (!blocks || blocks.length === 0) return "<p></p>";

  // If already a modern pure-HTML document block
  if (blocks.length === 1 && blocks[0].type === "html") {
    return blocks[0].content || "";
  }

  // Convert each legacy block into clean standard HTML
  return blocks
    .map((block) => {
      switch (block.type) {
        case "html": {
          return block.content || "";
        }
        case "heading": {
          const level = block.props?.level || 1;
          return `<h${level}>${block.content || ""}</h${level}>`;
        }
        case "paragraph": {
          return `<p>${block.content || ""}</p>`;
        }
        case "code": {
          const lang = (block.props?.language as string) || "python";
          return `<pre><code class="language-${lang}">${block.content || ""}</code></pre>`;
        }
        case "callout": {
          const type = (block.props?.calloutType as string) || "tip";
          const icon = type === "warning" ? "⚠️" : type === "info" ? "ℹ️" : "💡";
          return `<div class="callout callout-${type}">\n  <span class="callout-icon">${icon}</span>\n  <div class="callout-body">${block.content || ""}</div>\n</div>`;
        }
        case "math": {
          return `<div class="math-block">$$ ${block.content || ""} $$</div>`;
        }
        case "bullet_list": {
          return `<ul>\n  <li>${block.content || ""}</li>\n</ul>`;
        }
        case "numbered_list": {
          return `<ol>\n  <li>${block.content || ""}</li>\n</ol>`;
        }
        case "image": {
          const alt = (block.props?.alt as string) || "Note illustration";
          return `<figure>\n  <img src="${block.content || ""}" alt="${alt}" />\n  <figcaption>${alt}</figcaption>\n</figure>`;
        }
        case "pinned_note": {
          return `<div class="pinned-note">\n  <div class="pinned-header">📌 CORE TAKEAWAY / MANTRA</div>\n  <div class="pinned-content">${block.content || ""}</div>\n</div>`;
        }
        case "your_note": {
          const prompt = (block.props?.prompt as string) || block.content || "Your reflection prompt...";
          const lines = Number(block.props?.lines) || 3;
          let blanks = "";
          for (let i = 0; i < lines; i++) {
            blanks += `  <div class="rule-line"></div>\n`;
          }
          return `<div class="your-note">\n  <div class="note-header">✎ YOUR NOTE</div>\n  <p class="note-prompt">${prompt}</p>\n  <div class="rule-lines">\n${blanks}  </div>\n</div>`;
        }
        case "flow": {
          const steps = (block.props?.steps as FlowStep[]) || [];
          const title = (block.props?.title as string) || block.content || "";
          const stepItems = steps
            .map(
              (s) =>
                `    <div class="flow-step${s.highlighted ? " highlighted" : ""}">\n      <span class="flow-icon">${s.icon || "•"}</span>\n      <strong>${s.title}</strong>\n      <p>${s.description}</p>\n    </div>`
            )
            .join("\n");
          return `<div class="process-flow">\n  ${title ? `<h4>${title}</h4>\n` : ""}<div class="flow-steps">\n${stepItems}\n  </div>\n</div>`;
        }
        case "card_grid": {
          const cards = (block.props?.cards as ConceptCard[]) || [];
          const cardItems = cards
            .map(
              (c) =>
                `    <div class="concept-card card-${c.accent || "neutral"}">\n      <span class="card-icon">${c.icon || "💡"}</span>\n      <h4>${c.title}</h4>\n      <p>${c.content}</p>\n      ${c.fix ? `<div class="card-fix">${c.fix}</div>` : ""}\n    </div>`
            )
            .join("\n");
          return `<div class="card-grid">\n${cardItems}\n</div>`;
        }
        case "round_dialogue": {
          const round = Number(block.props?.round) || 1;
          const ask = (block.props?.ask as string) || "";
          const notice = (block.props?.notice as string) || "";
          return `<div class="prompt-round">\n  <span class="round-badge">Round ${round}</span>\n  ${ask ? `<div class="round-ask"><strong>You Ask:</strong> ${ask}</div>` : ""}\n  ${notice ? `<div class="round-notice"><strong>Notice:</strong> ${notice}</div>` : ""}\n</div>`;
        }
        default:
          return `<p>${block.content || ""}</p>`;
      }
    })
    .join("\n\n");
}

/**
 * Converts HTML from the editor directly into NoteBlock[] for storage & diffing.
 * In the Pure HTML architecture, the entire document is persisted as a single
 * first-class HTML document block, ensuring 100% fidelity without parsing loss.
 */
export function htmlToBlocks(html: string): NoteBlock[] {
  return [
    {
      id: "doc_root",
      type: "html",
      content: html || "",
    },
  ];
}
