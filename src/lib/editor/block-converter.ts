import type { NoteBlock } from "@/lib/supabase/types";

function safeEncode(val: unknown): string {
  try {
    return encodeURIComponent(JSON.stringify(val));
  } catch {
    return "";
  }
}

function safeDecode<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(decodeURIComponent(val));
  } catch {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
}

/**
 * Converts NoteBlock[] from database into rich HTML for TipTap editor
 */
export function blocksToHtml(blocks: NoteBlock[]): string {
  if (!blocks || blocks.length === 0) return "<p></p>";

  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const level = block.props?.level || 1;
          return `<h${level}>${block.content || ""}</h${level}>`;
        }
        case "paragraph": {
          return `<p>${block.content || ""}</p>`;
        }
        case "code": {
          const lang = block.props?.language || "python";
          return `<pre><code class="language-${lang}">${block.content || ""}</code></pre>`;
        }
        case "callout": {
          const type = (block.props?.calloutType as string) || "tip";
          return `<div data-type="callout" data-callout-type="${type}"><p>${block.content || ""}</p></div>`;
        }
        case "math": {
          return `<div data-type="callout" data-callout-type="tip"><p>$$ ${block.content || ""} $$</p></div>`;
        }
        case "bullet_list": {
          return `<ul><li>${block.content || ""}</li></ul>`;
        }
        case "numbered_list": {
          return `<ol><li>${block.content || ""}</li></ol>`;
        }
        case "image": {
          const alt = (block.props?.alt as string) || "Note illustration";
          return `<img src="${block.content || ""}" alt="${alt}" />`;
        }
        case "flow": {
          const encoded = safeEncode(block.props?.steps || []);
          const title = (block.props?.title as string) || block.content || "";
          return `<div data-type="process-flow" data-title="${encodeURIComponent(title)}" data-steps="${encoded}"><p>${title}</p></div>`;
        }
        case "your_note": {
          const prompt = (block.props?.prompt as string) || block.content || "Your reflection prompt...";
          const lines = Number(block.props?.lines) || 3;
          return `<div data-type="your-note" data-prompt="${encodeURIComponent(prompt)}" data-lines="${lines}"><p>${prompt}</p></div>`;
        }
        case "card_grid": {
          const encoded = safeEncode(block.props?.cards || []);
          return `<div data-type="card-grid" data-cards="${encoded}"><p>${block.content || ""}</p></div>`;
        }
        case "round_dialogue": {
          const round = Number(block.props?.round) || 1;
          const ask = (block.props?.ask as string) || "";
          const notice = (block.props?.notice as string) || "";
          return `<div data-type="prompt-round" data-round="${round}" data-ask="${encodeURIComponent(ask)}" data-notice="${encodeURIComponent(notice)}"><p>Round ${round}</p></div>`;
        }
        case "pinned_note": {
          return `<div data-type="pinned-note"><p>${block.content || ""}</p></div>`;
        }
        default:
          return `<p>${block.content || ""}</p>`;
      }
    })
    .join("\n");
}

/**
 * Converts rich HTML from TipTap editor back into NoteBlock[] for storage & diffing
 */
export function htmlToBlocks(html: string): NoteBlock[] {
  if (!html || typeof window === "undefined") {
    return [
      {
        id: "b_init",
        type: "paragraph",
        content: html || "",
      },
    ];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const children = Array.from(doc.body.children);

  if (children.length === 0) {
    const text = doc.body.textContent || "";
    return text.trim()
      ? [{ id: "b_" + Math.random().toString(36).slice(2, 8), type: "paragraph", content: text }]
      : [];
  }

  const blocks: NoteBlock[] = [];

  children.forEach((el, index) => {
    const id = "b_" + (index + 1) + "_" + Math.random().toString(36).slice(2, 6);
    const tagName = el.tagName.toLowerCase();

    if (tagName === "img") {
      const src = el.getAttribute("src") || "";
      const alt = el.getAttribute("alt") || "";
      if (src) {
        blocks.push({ id, type: "image", content: src, props: { alt } });
      }
    } else if (tagName === "p" && el.querySelector("img") && !el.textContent?.trim()) {
      const img = el.querySelector("img");
      const src = img?.getAttribute("src") || "";
      const alt = img?.getAttribute("alt") || "";
      if (src) {
        blocks.push({ id, type: "image", content: src, props: { alt } });
      }
    } else if (tagName === "h1") {
      blocks.push({ id, type: "heading", content: el.textContent || "", props: { level: 1 } });
    } else if (tagName === "h2") {
      blocks.push({ id, type: "heading", content: el.textContent || "", props: { level: 2 } });
    } else if (tagName === "h3" || tagName === "h4" || tagName === "h5" || tagName === "h6") {
      blocks.push({ id, type: "heading", content: el.textContent || "", props: { level: 3 } });
    } else if (tagName === "div" && el.getAttribute("data-type") === "callout") {
      const calloutType = (el.getAttribute("data-callout-type") || "tip") as "tip" | "warning" | "info";
      const p = el.querySelector("p");
      blocks.push({
        id,
        type: "callout",
        content: (p ? p.textContent : el.textContent) || "",
        props: { calloutType },
      });
    } else if (tagName === "pre") {
      const code = el.querySelector("code");
      const className = code?.className || el.className || "";
      const match = className.match(/language-([a-zA-Z0-9#+-]+)/);
      const language = match
        ? match[1]
        : (code?.getAttribute("data-language") || el.getAttribute("data-language") || "python");
      blocks.push({
        id,
        type: "code",
        content: (code ? code.textContent : el.textContent) || "",
        props: { language },
      });
    } else if (tagName === "ul") {
      const items = Array.from(el.querySelectorAll("li"));
      items.forEach((li, liIdx) => {
        blocks.push({
          id: `${id}_${liIdx}`,
          type: "bullet_list",
          content: li.textContent || "",
        });
      });
    } else if (tagName === "ol") {
      const items = Array.from(el.querySelectorAll("li"));
      items.forEach((li, liIdx) => {
        blocks.push({
          id: `${id}_${liIdx}`,
          type: "numbered_list",
          content: li.textContent || "",
        });
      });
    } else if (tagName === "blockquote") {
      blocks.push({
        id,
        type: "callout",
        content: el.textContent || "",
        props: { calloutType: "info" },
      });
    } else if (tagName === "div" && el.getAttribute("data-type") === "process-flow") {
      const title = decodeURIComponent(el.getAttribute("data-title") || "");
      const steps = safeDecode(el.getAttribute("data-steps"), []);
      blocks.push({
        id,
        type: "flow",
        content: title || el.querySelector("p")?.textContent || el.textContent || "",
        props: { title, steps },
      });
    } else if (tagName === "div" && (el.getAttribute("data-type") === "your-note" || el.getAttribute("data-type") === "workbook-note")) {
      const prompt = decodeURIComponent(el.getAttribute("data-prompt") || "") || el.querySelector("p")?.textContent || el.textContent || "Your reflection note...";
      const lines = parseInt(el.getAttribute("data-lines") || "3", 10);
      blocks.push({
        id,
        type: "your_note",
        content: prompt,
        props: { prompt, lines },
      });
    } else if (tagName === "div" && el.getAttribute("data-type") === "card-grid") {
      const cards = safeDecode(el.getAttribute("data-cards"), []);
      blocks.push({
        id,
        type: "card_grid",
        content: el.querySelector("p")?.textContent || el.textContent || "",
        props: { cards },
      });
    } else if (tagName === "div" && el.getAttribute("data-type") === "prompt-round") {
      const round = parseInt(el.getAttribute("data-round") || "1", 10);
      const ask = decodeURIComponent(el.getAttribute("data-ask") || "");
      const notice = decodeURIComponent(el.getAttribute("data-notice") || "");
      blocks.push({
        id,
        type: "round_dialogue",
        content: `Round ${round}`,
        props: { round, ask, notice },
      });
    } else if (tagName === "div" && el.getAttribute("data-type") === "pinned-note") {
      blocks.push({
        id,
        type: "pinned_note",
        content: el.querySelector("p")?.innerHTML || el.innerHTML || el.textContent || "",
      });
    } else {
      // Paragraph or default
      const text = el.textContent || "";
      if (text.startsWith("$$") && text.endsWith("$$")) {
        blocks.push({
          id,
          type: "math",
          content: text.replace(/^\$\$\s*/, "").replace(/\s*\$\$$/, ""),
        });
      } else {
        blocks.push({
          id,
          type: "paragraph",
          content: el.innerHTML || text,
        });
      }
    }
  });

  return blocks;
}

