/**
 * Verifies that the paged A4 HTML layout produces identical line breaks at
 * different window widths (task 5.1 / design D1).
 *
 * Usage (with `npm run dev` running):
 *   node scripts/check-line-breaks.ts [baseUrl]
 *
 * Opens /dev/paged-check in the locally installed Chrome (or Edge) at 1440px
 * and 390px wide, collects every text line's position in page units via
 * Range.getClientRects, and fails if any line differs.
 */
import { existsSync } from "node:fs";
import { chromium, type Browser } from "playwright-core";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const WIDTHS = [1440, 390];

const BROWSER_PATHS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((p): p is string => Boolean(p));

interface Snapshot {
  width: number;
  pageCount: number;
  scale: number;
  lines: number[][];
}

async function snapshot(browser: Browser, width: number): Promise<Snapshot> {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(`${BASE_URL}/dev/paged-check`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__pagedCheck?.ready === true, null, { timeout: 30_000 });

  // Wait until the line layout is stable (pagination may re-run after fonts load).
  let lines: number[][] = [];
  for (let i = 0; i < 20; i++) {
    const next = await page.evaluate(() => window.__pagedCheck!.lines());
    if (next.length > 0 && JSON.stringify(next) === JSON.stringify(lines)) break;
    lines = next;
    await page.waitForTimeout(250);
  }
  const info = await page.evaluate(() => window.__pagedCheck!.info!);
  await page.close();
  return { width, pageCount: info.pageCount, scale: info.scale, lines };
}

async function main() {
  const executablePath = BROWSER_PATHS.find((p) => existsSync(p));
  if (!executablePath) throw new Error("No Chrome/Edge found. Set CHROME_PATH.");
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const snaps: Snapshot[] = [];
    for (const w of WIDTHS) snaps.push(await snapshot(browser, w));

    for (const s of snaps) {
      console.log(`width ${s.width}px: scale ${s.scale.toFixed(3)}, ${s.pageCount} pages, ${s.lines.length} lines`);
    }

    const [ref, ...rest] = snaps;
    let failures = 0;
    for (const s of rest) {
      if (s.pageCount !== ref.pageCount) {
        console.error(`✗ page count differs: ${ref.width}px=${ref.pageCount}, ${s.width}px=${s.pageCount}`);
        failures++;
      }
      if (s.lines.length !== ref.lines.length) {
        console.error(`✗ line count differs: ${ref.width}px=${ref.lines.length}, ${s.width}px=${s.lines.length}`);
        failures++;
      }
      const n = Math.min(s.lines.length, ref.lines.length);
      let diffs = 0;
      for (let i = 0; i < n; i++) {
        const [t1, l1, w1] = ref.lines[i];
        const [t2, l2, w2] = s.lines[i];
        // Allow 1 page-unit of subpixel rounding from the scale transform.
        if (Math.abs(t1 - t2) > 1 || Math.abs(l1 - l2) > 1 || Math.abs(w1 - w2) > 1) {
          if (diffs++ < 5) console.error(`✗ line ${i}: ${ref.width}px=[${ref.lines[i]}] ${s.width}px=[${s.lines[i]}]`);
        }
      }
      if (diffs) {
        console.error(`✗ ${diffs} line(s) differ between ${ref.width}px and ${s.width}px`);
        failures++;
      }
    }

    if (failures) process.exit(1);
    console.log(`✓ identical line breaks at ${WIDTHS.join("px and ")}px`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
