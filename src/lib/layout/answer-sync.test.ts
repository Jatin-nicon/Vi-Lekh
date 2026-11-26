import { describe, expect, it } from "vitest";
import { cleanAnswers, hasAnswers, mergeAnswers, readLocalAnswers, sameAnswers, writeLocalAnswers } from "./answer-sync";

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

const T1 = "2026-11-26T10:00:00.000Z", T2 = "2026-11-26T11:00:00.000Z";

describe("answer sync", () => {
  it("merges field by field, newest answer wins", () => {
    const laptop = { name: { v: "Asha", t: T1 }, note: { v: "laptop note", t: T2 } };
    const phone = { name: { v: "Asha R", t: T2 }, note: { v: "old", t: T1 }, date: { v: "26/11", t: T1 } };
    expect(mergeAnswers(laptop, phone)).toEqual({ name: { v: "Asha R", t: T2 }, note: { v: "laptop note", t: T2 }, date: { v: "26/11", t: T1 } });
  });

  it("treats answers saved before change times as oldest", () => {
    const s = memoryStorage();
    s.setItem("f_n1", JSON.stringify({ name: "old", ok: true }));
    const local = readLocalAnswers(s, "f_n1");
    expect(mergeAnswers(local, { name: { v: "new", t: T1 } }).name.v).toBe("new");
    expect(local.ok.v).toBe(true);
  });

  it("round-trips through storage and ignores malformed account data", () => {
    const s = memoryStorage();
    const a = { name: { v: "Asha", t: T1 }, done: { v: false, t: T2 } };
    writeLocalAnswers(s, "f_n1", a);
    expect(JSON.parse(s.getItem("f_n1")!)).toEqual({ name: "Asha", done: false });
    expect(sameAnswers(readLocalAnswers(s, "f_n1"), a)).toBe(true);
    expect(cleanAnswers({ x: { v: 3, t: T1 }, y: null, z: { v: "ok", t: T1 } })).toEqual({ z: { v: "ok", t: T1 } });
    expect(hasAnswers({ a: { v: "", t: T1 }, b: { v: false, t: T1 } })).toBe(false);
  });
});
