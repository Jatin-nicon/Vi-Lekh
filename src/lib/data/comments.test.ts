import { beforeEach, describe, expect, it, vi } from "vitest";

/** A chainable stand-in for the Supabase query builder that records every call. */
type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: unknown };
const calls: Call[] = [];
/** What a query resolves to; a function gets that query's own calls. */
let result: Result | ((chain: Call[]) => Result) = { data: null, error: null };

function builder(): unknown {
  const chain: Call[] = [];
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve(typeof result === "function" ? result(chain) : result);
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
          chain.push({ method: prop, args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock("@/lib/supabase/client", () => ({ createClient: () => builder() }));

import {
  addComment,
  cleanBody,
  COMMENT_MAX,
  deleteComment,
  editComment,
  groupThreads,
  listOpenThreads,
  listReviewThreads,
  listThreads,
  replyToComment,
  setResolved,
  type NoteComment,
} from "./comments";

const c = (over: Partial<NoteComment>): NoteComment => ({
  id: "x", note_id: "n", thread_id: null, author_id: "u", revision_id: "v1", anchor: null, body: "b",
  resolved_at: null, resolved_by: null, created_at: "2026-01-01", updated_at: "2026-01-01", author: null, ...over,
});

const called = (method: string) => calls.filter((x) => x.method === method).map((x) => x.args);

beforeEach(() => {
  calls.length = 0;
  result = { data: null, error: null };
});

describe("comments", () => {
  it("checks comment length", () => {
    expect(cleanBody("  hi  ")).toBe("hi");
    expect(() => cleanBody("   ")).toThrow("Write a comment first.");
    expect(() => cleanBody("x".repeat(COMMENT_MAX + 1))).toThrow(/up to 2000/);
    expect(cleanBody("x".repeat(COMMENT_MAX))).toHaveLength(COMMENT_MAX);
  });

  it("groups replies under their threads, newest thread first", () => {
    const rows = [
      c({ id: "t1", created_at: "1" }),
      c({ id: "r2", thread_id: "t1", created_at: "4" }),
      c({ id: "t2", created_at: "2" }),
      c({ id: "r1", thread_id: "t1", created_at: "3" }),
      c({ id: "orphan", thread_id: "gone", created_at: "5" }),
    ];
    const threads = groupThreads(rows);
    expect(threads.map((t) => t.id)).toEqual(["t2", "t1"]);
    expect(threads[1].replies.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(threads[0].replies).toEqual([]);
  });

  it("lists a note's threads", async () => {
    result = { data: [c({ id: "t1" }), c({ id: "r1", thread_id: "t1" })], error: null };
    const threads = await listThreads("n1");
    expect(called("from")).toEqual([["note_comments"]]);
    expect(called("eq")).toEqual([["note_id", "n1"]]);
    expect(threads).toHaveLength(1);
    expect(threads[0].replies).toHaveLength(1);
  });

  it("starts a thread on a version with an anchor and trimmed text", async () => {
    result = { data: c({ id: "t1" }), error: null };
    const anchor = { quote: "one", prefix: "", suffix: " two", path: [0, 1] };
    await addComment({ noteId: "n1", authorId: "u1", revisionId: "v1", anchor, body: " Add an example? " });
    expect(called("insert")).toEqual([[{ note_id: "n1", author_id: "u1", revision_id: "v1", anchor, body: "Add an example?" }]]);
    expect(called("single")).toHaveLength(1);
  });

  it("refuses an empty comment without calling the database", async () => {
    await expect(addComment({ noteId: "n", authorId: "u", revisionId: "v", anchor: null, body: " " })).rejects.toThrow();
    expect(called("insert")).toEqual([]);
  });

  it("replies without an anchor or version", async () => {
    result = { data: c({ id: "r1", thread_id: "t1" }), error: null };
    await replyToComment({ noteId: "n1", threadId: "t1", authorId: "u1", body: "Thanks" });
    expect(called("insert")).toEqual([[{ note_id: "n1", thread_id: "t1", author_id: "u1", body: "Thanks" }]]);
  });

  it("edits only the text, and says so when the comment isn't the user's", async () => {
    result = { data: c({ id: "t1", body: "new" }), error: null };
    await editComment("t1", "new");
    expect(called("update")).toEqual([[{ body: "new" }]]);
    expect(called("eq")).toEqual([["id", "t1"]]);
    result = { data: null, error: null };
    await expect(editComment("t1", "new")).rejects.toThrow("You can only edit your own comments.");
  });

  it("deletes, and says so when nothing was deleted", async () => {
    result = { data: [{ id: "t1" }], error: null };
    await deleteComment("t1");
    expect(called("delete")).toHaveLength(1);
    result = { data: [], error: null };
    await expect(deleteComment("t1")).rejects.toThrow("You can only delete your own comments.");
  });

  it("resolves and reopens through the database function", async () => {
    result = { data: c({ id: "t1", resolved_at: "now" }), error: null };
    await setResolved("t1", true);
    await setResolved("t1", false);
    expect(called("rpc")).toEqual([
      ["set_comment_resolved", { p_id: "t1", p_resolved: true }],
      ["set_comment_resolved", { p_id: "t1", p_resolved: false }],
    ]);
  });

  it("lists open threads for the review area with reply counts, optionally for some courses", async () => {
    result = { data: [], error: null };
    await listOpenThreads(["c1"]);
    expect(called("is")).toEqual([["thread_id", null], ["resolved_at", null]]);
    expect(called("in")).toEqual([["note.course_id", ["c1"]]]);
    calls.length = 0;
    result = { data: [{ id: "t1", thread_id: "t1" }], error: null };
    const open = await listOpenThreads();
    expect(called("in")).toEqual([["thread_id", ["t1"]]]);
    expect(open[0].reply_count).toBe(1);
  });

  it("keeps only threads in courses the user reviews", async () => {
    const rows = [
      { id: "a", note: { id: "n1", title: "A", course_id: "c-mine" } },
      { id: "b", note: { id: "n2", title: "B", course_id: "c-other" } },
    ];
    result = (chain) => {
      const rpc = chain.find((c) => c.method === "rpc");
      if (rpc) return { data: (rpc.args[1] as { p_course_id: string }).p_course_id === "c-mine", error: null };
      if (chain.some((c) => c.method === "in")) return { data: [], error: null }; // reply counts
      return { data: rows, error: null };
    };
    const threads = await listReviewThreads();
    expect(called("rpc")).toEqual([
      ["is_course_reviewer", { p_course_id: "c-mine" }],
      ["is_course_reviewer", { p_course_id: "c-other" }],
    ]);
    expect(threads.map((t) => t.id)).toEqual(["a"]);
  });

  it("passes database errors on", async () => {
    result = { data: null, error: new Error("denied") };
    await expect(listThreads("n")).rejects.toThrow("denied");
    await expect(setResolved("t", true)).rejects.toThrow("denied");
  });
});
