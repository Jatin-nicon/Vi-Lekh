import { notesStore, INITIAL_PROFILES } from "../src/lib/data/notes-store";
import { JSDOM } from "jsdom";
import { diffSegments } from "../src/lib/diff/html-diff";
import { blocksToHtml } from "../src/lib/editor/block-converter";
import type { NoteBlock } from "../src/lib/supabase/types";

// The HTML diff parses with DOMParser; provide one outside the browser.
globalThis.DOMParser = new JSDOM().window.DOMParser;

function runVerification() {
  console.log("=== Running Vi-Lekh End-to-End Lifecycle Verification ===");

  const alex = INITIAL_PROFILES["alex-core"];
  const sarah = INITIAL_PROFILES["sarah-contributor"];

  // 1. Verify Initial State
  const noteBefore = notesStore.getNote("n1")!;
  console.log("1. Initial Note active revision:", noteBefore.current_revision_id);
  if (noteBefore.current_revision_id !== "rev_v1") {
    throw new Error("Initial revision should be rev_v1");
  }

  // 2. Contributor submits proposed revision
  const proposedBlocks: NoteBlock[] = [
    {
      id: "b1",
      type: "heading",
      content: "Understanding Cross-Entropy Loss (Updated)",
      props: { level: 1 },
    },
    {
      id: "b2",
      type: "paragraph",
      content: "Updated mathematical explanation of negative log likelihood.",
    },
    {
      id: "b_extra_theorem",
      type: "math",
      content: "\\mathcal{L}_{CE} = - \\sum_{i=1}^C y_i \\log p_i",
    },
  ];

  console.log("2. Sarah (Contributor) submits revision proposal...");
  const pendingRev = notesStore.submitRevision(
    "n1",
    sarah,
    proposedBlocks,
    "Refined NLL explanation and added clean loss notation",
    false // contributor
  );

  console.log("   -> Revision created with status:", pendingRev.status);
  if (pendingRev.status !== "pending") {
    throw new Error("Contributor revision must be pending");
  }

  const noteDuringPending = notesStore.getNote("n1")!;
  console.log("   -> Live note active revision remains:", noteDuringPending.current_revision_id);
  if (noteDuringPending.current_revision_id !== "rev_v1") {
    throw new Error("Live note must NOT change for pending revision");
  }

  // 3. Test Block Diff Computation
  console.log("3. Computing section-level HTML diff...");
  const baseRev = notesStore.getRevision("rev_v1")!;
  const diffs = diffSegments(blocksToHtml(baseRev.blocks), blocksToHtml(proposedBlocks));
  const additions = diffs.filter((d) => d.type === "added");
  const modifications = diffs.filter((d) => d.type === "changed");
  const deletions = diffs.filter((d) => d.type === "removed");

  console.log(`   -> Diff result: ${additions.length} additions, ${modifications.length} modifications, ${deletions.length} deletions`);
  if (additions.length === 0 && modifications.length === 0) {
    throw new Error("Diff calculation failed to detect changes");
  }

  // 4. Core Team reviews and approves
  console.log("4. Alex (Core Team) approves and merges revision...");
  const updatedNote = notesStore.approveRevision(pendingRev.id, alex, "Looks mathematically sound.");
  console.log("   -> Live note active revision is now:", updatedNote.current_revision_id);
  if (updatedNote.current_revision_id !== pendingRev.id) {
    throw new Error("Live note pointer must atomically point to approved revision");
  }

  // 5. Core Team Direct Edit
  console.log("5. Alex (Core Team) submits direct edit...");
  const directRev = notesStore.submitRevision(
    "n1",
    alex,
    [
      ...proposedBlocks,
      {
        id: "b_staff_note",
        type: "callout",
        content: "Staff Notice: Homework 3 due next Tuesday.",
        props: { calloutType: "tip" },
      },
    ],
    "Added homework notice",
    true // core_team
  );

  console.log("   -> Direct revision status:", directRev.status);
  const noteAfterDirect = notesStore.getNote("n1")!;
  console.log("   -> Live note active revision immediately updated to:", noteAfterDirect.current_revision_id);
  if (noteAfterDirect.current_revision_id !== directRev.id) {
    throw new Error("Direct edit must update live note pointer immediately");
  }

  console.log("\n>>> ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! <<<");
}

runVerification();

