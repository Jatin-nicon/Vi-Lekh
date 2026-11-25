"use client";

/**
 * Dev-only harness for the paged A4 layout. `scripts/check-line-breaks.ts`
 * opens this page at several window widths and compares line positions.
 * Not available in production builds.
 */

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { HtmlSandboxedViewer, type PagedLayoutInfo } from "@/components/editor/html-sandboxed-viewer";
import { SAMPLE_HTML } from "../sample-note";

declare global {
  interface Window {
    __pagedCheck?: { ready: boolean; info: PagedLayoutInfo | null; lines: () => number[][] };
  }
}

function collectLines(): number[][] {
  const host = document.querySelector(".html-sandboxed-viewer-host");
  const flow = host?.shadowRoot?.querySelector<HTMLElement>(".vl-flow");
  if (!flow) return [];
  const flowRect = flow.getBoundingClientRect();
  const scale = flowRect.width / flow.offsetWidth;
  const out: number[][] = [];
  const walker = document.createTreeWalker(flow, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      out.push([
        Math.round(((r.top - flowRect.top) / scale) * 2) / 2,
        Math.round(((r.left - flowRect.left) / scale) * 2) / 2,
        Math.round((r.width / scale) * 2) / 2,
      ]);
    }
  }
  return out;
}

export default function PagedCheckPage() {
  const [info, setInfo] = useState<PagedLayoutInfo | null>(null);

  useEffect(() => {
    window.__pagedCheck = { ready: false, info: null, lines: collectLines };
  }, []);

  useEffect(() => {
    if (!info || !window.__pagedCheck) return;
    window.__pagedCheck.info = info;
    // Ready once fonts have settled and pagination has run with final metrics.
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        if (window.__pagedCheck) window.__pagedCheck.ready = true;
      }),
    );
  }, [info]);

  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="p-2">
      <HtmlSandboxedViewer html={SAMPLE_HTML} paged theme="light" onLayout={setInfo} />
    </main>
  );
}
