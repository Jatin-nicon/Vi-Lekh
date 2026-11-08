import type { Course, Module, Note, Revision, NoteBlock, Profile } from "@/lib/supabase/types";

// Initial Demo Data
export const INITIAL_COURSE: Course = {
  id: "c1",
  slug: "machine-learning-foundations",
  title: "CS229: Machine Learning Foundations",
  description: "Comprehensive mathematical and empirical foundations of machine learning, neural networks, and statistical learning theory.",
  domain: "Artificial Intelligence",
  icon: "Brain",
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-05T00:00:00.000Z",
};

export const INITIAL_MODULES: Module[] = [
  {
    id: "m1",
    course_id: "c1",
    slug: "optimization",
    title: "Module 1: Convex Optimization & Gradient Descent",
    order_index: 1,
    created_at: "2026-11-01T00:00:00.000Z",
  },
  {
    id: "m2",
    course_id: "c1",
    slug: "neural-networks",
    title: "Module 2: Neural Networks & Backpropagation",
    order_index: 2,
    created_at: "2026-11-01T00:00:00.000Z",
  },
];

export const INITIAL_PROFILES: Record<string, Profile> = {
  "alex-core": {
    id: "alex-core",
    username: "alex_core",
    display_name: "Alex Rivera",
    role: "core_team",
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-05T00:00:00.000Z",
  },
  "sarah-contributor": {
    id: "sarah-contributor",
    username: "sarah_chen",
    display_name: "Sarah Chen",
    role: "contributor",
    avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-05T00:00:00.000Z",
  },
};

const BASE_BLOCKS: NoteBlock[] = [
  {
    id: "b1",
    type: "heading",
    content: "Understanding Cross-Entropy Loss",
    props: { level: 1 },
  },
  {
    id: "b2",
    type: "paragraph",
    content:
      "Cross-entropy loss (also called log loss) measures the performance of a classification model whose output is a probability value between 0 and 1. As the predicted probability diverges from the actual label, cross-entropy loss increases rapidly.",
  },
  {
    id: "b3",
    type: "math",
    content: "L_{CE}(y, \\hat{y}) = - \\sum_{i=1}^{C} y_i \\log(\\hat{y}_i)",
  },
  {
    id: "b4",
    type: "callout",
    content: "Important property: Cross-entropy is strictly convex for logistic regression models, which guarantees gradient descent reaches the global minimum without getting trapped in local minima.",
    props: { calloutType: "tip" },
  },
  {
    id: "b5",
    type: "code",
    content: "import torch\nimport torch.nn as nn\n\n# PyTorch CrossEntropyLoss combines LogSoftmax and NLLLoss\nloss_fn = nn.CrossEntropyLoss()\nloss = loss_fn(predictions, targets)",
    props: { language: "python" },
  },
];

export const INITIAL_REVISION: Revision = {
  id: "rev_v1",
  note_id: "n1",
  author_id: "alex-core",
  blocks: BASE_BLOCKS,
  change_summary: "Initial baseline note publication",
  status: "approved",
  reviewer_id: "alex-core",
  reviewer_notes: "Approved for syllabus launch",
  created_at: "2026-11-03T10:00:00.000Z",
  updated_at: "2026-11-05T14:30:00.000Z",
  author: INITIAL_PROFILES["alex-core"],
};

export const SAMPLE_PENDING_REVISION: Revision = {
  id: "rev_pending_1",
  note_id: "n1",
  base_revision_id: "rev_v1",
  author_id: "sarah-contributor",
  blocks: [
    ...BASE_BLOCKS.slice(0, 3),
    {
      id: "b_new_derivation",
      type: "math",
      content: "\\frac{\\partial L_{CE}}{\\partial z_k} = \\hat{y}_k - y_k",
    },
    {
      id: "b4",
      type: "callout",
      content: "Important property: Cross-entropy combined with Softmax yields the elegant gradient (y_hat - y), making backward propagation computationally efficient.",
      props: { calloutType: "tip" },
    },
    ...BASE_BLOCKS.slice(4),
  ],
  change_summary: "Added Softmax gradient derivation and clarified computational efficiency",
  status: "pending",
  created_at: "2026-11-06T11:20:00.000Z",
  updated_at: "2026-11-06T11:20:00.000Z",
  author: INITIAL_PROFILES["sarah-contributor"],
};

export const INITIAL_NOTE: Note = {
  id: "n1",
  course_id: "c1",
  module_id: "m2",
  slug: "cross-entropy-loss",
  title: "Cross-Entropy Loss & Optimization",
  current_revision_id: "rev_v1",
  created_by: "alex-core",
  created_at: "2026-11-01T09:00:00.000Z",
  updated_at: "2026-11-05T14:30:00.000Z",
};

// Global in-memory state for development & tests
class NotesStore {
  private notes: Map<string, Note> = new Map([["n1", INITIAL_NOTE]]);
  private revisions: Map<string, Revision> = new Map([
    ["rev_v1", INITIAL_REVISION],
    ["rev_pending_1", SAMPLE_PENDING_REVISION],
  ]);

  getNote(id: string): Note | undefined {
    return this.notes.get(id);
  }

  getRevision(id: string): Revision | undefined {
    return this.revisions.get(id);
  }

  getRevisionsForNote(noteId: string): Revision[] {
    return Array.from(this.revisions.values()).filter((r) => r.note_id === noteId);
  }

  getPendingRevisions(): Revision[] {
    return Array.from(this.revisions.values()).filter((r) => r.status === "pending");
  }

  submitRevision(
    noteId: string,
    author: Profile,
    blocks: NoteBlock[],
    summary: string,
    isCoreTeam: boolean
  ): Revision {
    const note = this.notes.get(noteId);
    if (!note) throw new Error("Note not found");

    const newRevId = "rev_" + Math.random().toString(36).substring(2, 9);
    const newRev: Revision = {
      id: newRevId,
      note_id: noteId,
      base_revision_id: note.current_revision_id,
      author_id: author.id,
      author,
      blocks,
      change_summary: summary,
      status: isCoreTeam ? "direct_publish" : "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.revisions.set(newRevId, newRev);

    // If author is in core team, auto-publish immediately!
    if (isCoreTeam) {
      note.current_revision_id = newRevId;
      note.updated_at = newRev.created_at;
      this.notes.set(noteId, note);
    }

    return newRev;
  }

  approveRevision(revisionId: string, reviewer: Profile, notes?: string): Note {
    const rev = this.revisions.get(revisionId);
    if (!rev) throw new Error("Revision not found");

    const note = this.notes.get(rev.note_id);
    if (!note) throw new Error("Note not found");

    // Atomic update
    rev.status = "approved";
    rev.reviewer_id = reviewer.id;
    rev.reviewer = reviewer;
    rev.reviewer_notes = notes || "Approved and merged into live note.";
    rev.updated_at = new Date().toISOString();
    this.revisions.set(revisionId, rev);

    note.current_revision_id = revisionId;
    note.updated_at = rev.updated_at;
    this.notes.set(note.id, note);

    return note;
  }

  rejectRevision(revisionId: string, reviewer: Profile, feedback: string): Revision {
    const rev = this.revisions.get(revisionId);
    if (!rev) throw new Error("Revision not found");

    rev.status = "rejected";
    rev.reviewer_id = reviewer.id;
    rev.reviewer = reviewer;
    rev.reviewer_notes = feedback;
    rev.updated_at = new Date().toISOString();
    this.revisions.set(revisionId, rev);

    return rev;
  }
}

export const notesStore = new NotesStore();

