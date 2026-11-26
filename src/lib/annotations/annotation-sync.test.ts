import { describe, expect, it } from "vitest";
import { normalizePage, pageFingerprint, planMerge, readLocalPages, writeLocalPage } from "./annotation-sync";

const stroke = (id: string) => ({ id, points: [{ x: 1, y: 2 }], color: "#000", width: 2, tool: "pen" }) as never;
const page = (...ids: string[]) => normalizePage({ strokes: ids.map(stroke) });

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
  };
}

describe("planMerge", () => {
  const T1 = "2026-11-26T10:00:00.000Z", T2 = "2026-11-26T11:00:00.000Z";

  it("applies a newer account copy and uploads a newer device copy", () => {
    const plan = planMerge(
      { 1: page("a"), 2: page("b2") },
      { 1: { updatedAt: T1, synced: true }, 2: { updatedAt: T2, synced: false } },
      [
        { page_number: 1, data: page("a", "x"), updated_at: T2 },
        { page_number: 2, data: page("b"), updated_at: T1 },
      ],
    );
    expect(Object.keys(plan.apply)).toEqual(["1"]);
    expect(plan.upload).toEqual([2]);
  });

  it("brings account pages to a new device and uploads pages made before sync", () => {
    const plan = planMerge({ 3: page("old") }, {}, [{ page_number: 1, data: page("a"), updated_at: T1 }]);
    expect(Object.keys(plan.apply)).toEqual(["1"]);
    expect(plan.upload).toEqual([3]);
  });

  it("uploads a page cleared on this device", () => {
    const plan = planMerge({}, { 1: { updatedAt: T2, synced: false } }, [{ page_number: 1, data: page("a"), updated_at: T1 }]);
    expect(plan.upload).toEqual([1]);
  });

  it("does nothing when both copies match", () => {
    const plan = planMerge({ 1: page("a") }, {}, [{ page_number: 1, data: page("a"), updated_at: T1 }]);
    expect(plan).toEqual({ apply: {}, upload: [] });
  });
});

describe("local pages", () => {
  it("round-trips pages per layout and note", () => {
    const s = memoryStorage();
    writeLocalPage(s, "html-page", "n1", 1, page("a"));
    writeLocalPage(s, "html-page", "n1", 12, page("b"));
    writeLocalPage(s, "pdf", "n1", 1, page("c"));
    writeLocalPage(s, "html-page", "n2", 1, page("d"));
    const pages = readLocalPages(s, "html-page", "n1");
    expect(Object.keys(pages)).toEqual(["1", "12"]);
    expect(pageFingerprint(pages[12])).toBe(pageFingerprint(page("b")));
    writeLocalPage(s, "html-page", "n1", 12, normalizePage({}));
    expect(Object.keys(readLocalPages(s, "html-page", "n1"))).toEqual(["1"]);
  });
});
