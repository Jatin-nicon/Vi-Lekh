import { PAGE_HEIGHT, PAGE_PITCH, PAGE_WIDTH } from "@/lib/layout/paginate";
import { DOCUMENT_WIDTH } from "@/lib/layout/document-html";
import { computeSlices, measureBoxes } from "./document-slices";

/**
 * Annotated HTML → PDF via the browser print engine (design D4).
 *
 * Builds a hidden print container with one 210 × 297 mm window per page.
 * Each window holds a copy of the paginated note (same flow, same spacers, so
 * the same line and page breaks as on screen) shifted up by n × PAGE_PITCH,
 * plus that page's annotation overlay scaled back to page units. Overlays of
 * the neighbouring pages are included at ±PAGE_PITCH, so a mark that crosses a
 * page break prints its part on each page, exactly as it shows on screen.
 * A complete HTML document (one continuous page) is scaled to the A4 width and
 * cut into pages between blocks.
 * Text stays selectable and annotations stay vector (SVG).
 */

export interface PrintPagedHtmlOptions {
  /** The paged HtmlSandboxedViewer's shadow host (`.html-sandboxed-viewer-host`). */
  viewerHost: HTMLElement;
  /** Container holding the `.vl-page-overlay[data-page=n]` elements. */
  overlayRoot?: ParentNode | null;
  /** Document title used as the default PDF file name. */
  title?: string;
}

const ROOT_ID = "vl-print-root";
const STYLE_ID = "vl-print-style";

const PRINT_CSS = `
@media screen {
  #${ROOT_ID} { display: none !important; }
}
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body > *:not(#${ROOT_ID}) { display: none !important; }
  #${ROOT_ID} { display: block !important; }
  .vl-print-page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    /* Size containment makes the page monolithic: the browser must not re-flow the copy inside it. */
    contain: strict;
    break-after: page;
    page-break-after: always;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .vl-print-page:last-child { break-after: auto; page-break-after: auto; }
  .vl-print-ink { position: absolute; left: 0; transform-origin: top left; pointer-events: none; }
  .vl-print-ink .print\\:hidden, .vl-print-ink [data-print-hidden] { display: none !important; }
}
`;

/** Content CSS for the printed copy: no sheets, light theme, page-unit pinned. */
const PRINT_FLOW_CSS = `
  :host { display: block; }
  .vl-sheets { display: none !important; }
  .vl-pages { position: absolute; left: 0; top: 0; width: ${PAGE_WIDTH}px; }
  .vl-flow { background: transparent !important; }
`;

function removeExisting(doc: Document) {
  doc.getElementById(ROOT_ID)?.remove();
  doc.getElementById(STYLE_ID)?.remove();
}

/** Copies an overlay, freezing form values so text boxes print their text. */
function cloneInk(overlay: Element): HTMLElement {
  const clone = overlay.cloneNode(true) as HTMLElement;
  const srcAreas = overlay.querySelectorAll("textarea");
  clone.querySelectorAll("textarea").forEach((area, i) => {
    const div = area.ownerDocument.createElement("div");
    div.className = area.className;
    div.setAttribute("style", area.getAttribute("style") ?? "");
    div.style.whiteSpace = "pre-wrap";
    div.textContent = srcAreas[i]?.value ?? area.value;
    area.replaceWith(div);
  });
  clone.querySelectorAll("input, button").forEach((el) => el.remove());
  return clone;
}

/**
 * Opens the print dialog with the annotated, paginated note. Resolves after
 * the dialog closes and the print container has been removed.
 */
export function printPagedHtml({ viewerHost, overlayRoot, title }: PrintPagedHtmlOptions): Promise<void> {
  const doc = viewerHost.ownerDocument;
  const win = doc.defaultView ?? window;
  const shadow = viewerHost.shadowRoot;
  const flow = shadow?.querySelector<HTMLElement>(".vl-flow");
  if (!shadow || !flow) return Promise.reject(new Error("Paged viewer is not rendered"));

  removeExisting(doc);

  const isDocument = Boolean(shadow.querySelector(".vl-pages[data-document]"));
  const unitWidth = isDocument ? DOCUMENT_WIDTH : PAGE_WIDTH;
  const ratio = PAGE_WIDTH / unitWidth;
  const slices = isDocument
    ? computeSlices(measureBoxes(flow), flow.offsetHeight, PAGE_HEIGHT / ratio)
    : Array.from({ length: Math.max(1, shadow.querySelectorAll(".vl-sheet").length) }, (_, i) => ({
        top: i * PAGE_PITCH,
        height: PAGE_HEIGHT,
      }));
  const background = isDocument ? getComputedStyle(shadow.querySelector(".vl-doc") ?? flow).backgroundColor : "";
  const contentStyles = Array.from(shadow.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n");
  const links = Array.from(shadow.querySelectorAll("link[rel=stylesheet]"))
    .map((l) => l.outerHTML)
    .join("");
  const flowHtml = flow.innerHTML;

  const overlays = new Map<number, Element>();
  overlayRoot?.querySelectorAll(".vl-page-overlay[data-page]").forEach((el) => {
    overlays.set(Number((el as HTMLElement).dataset.page), el);
  });

  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = PRINT_CSS;
  doc.head.appendChild(style);

  const root = doc.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("aria-hidden", "true");

  for (const [i, slice] of slices.entries()) {
    const page = doc.createElement("div");
    page.className = "vl-print-page";
    page.dataset.page = String(i + 1);
    page.style.backgroundColor = background;

    // Document units → page units, clipped to this slice.
    const windowEl = doc.createElement("div");
    windowEl.style.cssText = `position:absolute;left:0;top:0;width:${unitWidth}px;height:${slice.height}px;overflow:hidden;transform:scale(${ratio});transform-origin:top left;`;
    page.appendChild(windowEl);

    // Content window: the whole flow, shifted so page i is in view.
    const host = doc.createElement("div");
    host.style.cssText = `position:absolute;left:0;top:0;width:${unitWidth}px;height:${slice.height}px;`;
    const hostShadow = host.attachShadow({ mode: "open" });
    hostShadow.innerHTML = `${links}<style>${contentStyles}${PRINT_FLOW_CSS}</style>
      <div class="vl-pages" style="transform:translateY(${-slice.top}px)">
        <div class="vl-flow sandbox-container">${flowHtml}</div>
      </div>`;
    windowEl.appendChild(host);

    // Ink: this page's overlay plus its neighbours (for marks crossing a break).
    for (const n of isDocument ? [1] : [i, i + 1, i + 2]) {
      const overlay = overlays.get(n);
      if (!overlay) continue;
      const rect = overlay.getBoundingClientRect();
      const scale = rect.width > 0 ? rect.width / unitWidth : 1;
      const ink = cloneInk(overlay);
      ink.classList.add("vl-print-ink");
      ink.style.top = `${(n - 1) * PAGE_PITCH - slice.top}px`;
      ink.style.left = "0";
      ink.style.width = `${unitWidth * scale}px`;
      ink.style.height = `${isDocument ? rect.height : PAGE_HEIGHT * scale}px`;
      ink.style.transform = `scale(${1 / scale})`;
      windowEl.appendChild(ink);
    }
    root.appendChild(page);
  }
  doc.body.appendChild(root);

  const previousTitle = doc.title;
  if (title) doc.title = title;

  return new Promise<void>((resolve) => {
    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      win.removeEventListener("afterprint", cleanup);
      removeExisting(doc);
      doc.title = previousTitle;
      resolve();
    };
    win.addEventListener("afterprint", cleanup);
    // Let the copies lay out and fonts settle before opening the dialog.
    const fontsReady = doc.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() =>
      // `afterprint` removes the container. If a browser never fires it, the
      // leftover container is screen-hidden and removed on the next export.
      win.requestAnimationFrame(() => win.print()),
    );
  });
}
