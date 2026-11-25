import { describe, expect, it } from "vitest";
import { contributionSnippet, imageSnippet } from "./contribution-snippets";
import { segmentHtml } from "@/lib/diff/html-diff";

const A = { id: "uid-a", name: "Asha" };

describe("contributionSnippet", () => {
  it("builds a Case Study with Context, What happened and Findings fields", () => {
    const html = contributionSnippet("case-study", A, "sec-1");
    const el = new DOMParser().parseFromString(html, "text/html").querySelector("section")!;
    expect(el.className).toBe("vl-contribution vl-case-study");
    expect(el.dataset.sectionId).toBe("sec-1");
    expect(el.dataset.contributorId).toBe("uid-a");
    expect(el.dataset.contributorName).toBe("Asha");
    expect(el.querySelector("h3")!.textContent).toBe("Case Study");
    expect([...el.querySelectorAll("strong")].map((s) => s.textContent)).toEqual(["Context:", "What happened:", "Findings:"]);
  });

  it("builds My Experience and Findings sections with a heading and body", () => {
    for (const [kind, heading] of [["experience", "My Experience"], ["findings", "Findings"]] as const) {
      const el = new DOMParser().parseFromString(contributionSnippet(kind, A), "text/html").querySelector("section")!;
      expect(el.querySelector("h3")!.textContent).toBe(heading);
      expect(el.children.length).toBeGreaterThan(1);
    }
  });

  it("gives each insertion a new section id", () => {
    const id = (h: string) => /data-section-id="([^"]+)"/.exec(h)![1];
    expect(id(contributionSnippet("findings", A))).not.toBe(id(contributionSnippet("findings", A)));
  });

  it("escapes the contributor name", () => {
    const html = contributionSnippet("experience", { id: "x", name: 'Bo "<b>"' }, "s");
    const el = new DOMParser().parseFromString(html, "text/html").querySelector("section")!;
    expect(el.dataset.contributorName).toBe('Bo "<b>"');
    expect(el.querySelector("b")).toBeNull();
  });

  it("keys the section by its id so later edits diff as changed", () => {
    const [seg] = segmentHtml(contributionSnippet("findings", A, "keep-me"));
    expect(seg.key).toBe("id:keep-me");
  });

  it("omits contributor attributes when signed out", () => {
    expect(contributionSnippet("findings", null, "s")).not.toContain("data-contributor");
  });
});

describe("imageSnippet", () => {
  it("wraps the image in a figure with alt text from the file name", () => {
    expect(imageSnippet("data:image/png;base64,AAA", "loss_curve-v2.png")).toContain('alt="loss curve v2"');
  });
});
