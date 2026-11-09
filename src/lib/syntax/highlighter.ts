import Prism from "prismjs";

// Import commonly used language grammars for Prism
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-yaml";

export const SUPPORTED_LANGUAGES: { id: string; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "sql", label: "SQL" },
  { id: "json", label: "JSON" },
  { id: "bash", label: "Bash / Shell" },
  { id: "java", label: "Java" },
  { id: "c", label: "C" },
  { id: "cpp", label: "C++" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "markdown", label: "Markdown" },
  { id: "yaml", label: "YAML" },
  { id: "plaintext", label: "Plain text" },
];

export function normalizeLanguage(lang?: string): string {
  if (!lang) return "plaintext";
  const l = lang.toLowerCase().trim();
  if (l === "js") return "javascript";
  if (l === "ts" || l === "tsx") return "typescript";
  if (l === "py") return "python";
  if (l === "sh" || l === "zsh" || l === "shell") return "bash";
  if (l === "c++") return "cpp";
  if (l === "rs") return "rust";
  if (l === "golang") return "go";
  if (l === "md") return "markdown";
  if (l === "yml") return "yaml";
  if (l === "text" || l === "txt") return "plaintext";
  return l;
}

export function getLanguageLabel(lang?: string): string {
  const norm = normalizeLanguage(lang);
  const found = SUPPORTED_LANGUAGES.find((item) => item.id === norm);
  if (found) return found.label;
  return lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : "Plain text";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function highlightCode(code: string, language?: string): string {
  if (!code) return "";
  const norm = normalizeLanguage(language);

  if (norm === "plaintext" || !norm) {
    return escapeHtml(code);
  }

  const grammar = Prism.languages[norm];
  if (grammar) {
    try {
      return Prism.highlight(code, grammar, norm);
    } catch (err) {
      console.warn("Prism highlight error for " + norm, err);
      return escapeHtml(code);
    }
  }

  // Fallback if grammar not loaded
  return escapeHtml(code);
}
