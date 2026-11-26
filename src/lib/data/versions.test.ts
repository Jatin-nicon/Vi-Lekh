import { describe, expect, it } from "vitest";
import { describeSource, setVersionParam, versionParam, type VersionSummary } from "./versions";

const v = (over: Partial<VersionSummary>): VersionSummary => ({
  id: "r", version_number: 1, created_at: "", change_summary: "", source: "edit",
  restored_from_revision_id: null, author: null, merger: null, ...over,
});

describe("versions", () => {
  it("labels where a version came from", () => {
    const numbers = new Map([["r3", 3]]);
    expect(describeSource(v({ source: "restore", restored_from_revision_id: "r3" }), numbers)).toBe("Restored from v3");
    expect(describeSource(v({ source: "suggestion" }), numbers)).toBe("Merged suggestion");
    expect(describeSource(v({ source: "legacy" }), numbers)).toBe("Published");
  });

  it("keeps other query parameters when opening and closing a version", () => {
    window.history.replaceState(null, "", "/notes?course=c&note=n");
    setVersionParam("r2");
    expect(versionParam()).toBe("r2");
    expect(window.location.search).toBe("?course=c&note=n&version=r2");
    setVersionParam(null);
    expect(window.location.search).toBe("?course=c&note=n");
  });
});
