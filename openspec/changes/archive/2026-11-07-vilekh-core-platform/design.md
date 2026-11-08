# Design

## Context

Vi-Lekh is a greenfield collaborative knowledge base for educational courses and AI topics. See `proposal.md` for motivation and scope. The implementation combines a Notion-style block editor, a Wikipedia-inspired hybrid review pipeline, and a Supabase PostgreSQL backend with Row Level Security (RLS).

## Goals / Non-Goals

**Goals:**
- Provide a responsive, distraction-free block editing canvas with slash commands (`/`), LaTeX math blocks (via KaTeX), and syntax-highlighted code.
- Implement an atomic review state machine where contributor edits are queued for Core Team approval while Core Team edits publish immediately.
- Provide visual block-level diff comparison between active and proposed note revisions.
- Establish a coherent visual design system using a Warm Slate palette with Electric Cobalt/Indigo accents and accessible dark mode.
- Enforce strict database-level security via Supabase RLS and role-based permissions (`core_team` vs `contributor`).

**Non-Goals:**
- Real-time multiplayer collaborative typing (e.g., Google Docs CRDT/Yjs) in initial release; revisions are asynchronous proposals.
- Automated AI auto-grading or evaluation of notes in phase 1.
- Public wiki unrestricted direct editing without review gates.

## Decisions

### 1. Frontend Architecture: Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Rationale**: Next.js App Router provides Server-Side Rendering (SSR) and React Server Components for fast initial note rendering and SEO. Tailwind CSS combined with shadcn/ui provides composable, accessible UI primitives (dialogs, toolbars, dropdowns) with native light/dark mode support.
- **Alternatives Considered**: 
  - *Vite + React SPA*: Lacks built-in SSR/SEO for public knowledge base articles.
  - *Remix*: Good SSR, but smaller ecosystem for ready-made Notion editor wrappers.

### 2. Editor Engine: BlockNote (built on TipTap / ProseMirror)
- **Rationale**: BlockNote provides a modular, block-first editing experience out-of-the-box (drag handles, slash menus, nested blocks) with clean JSON serialization. It supports custom KaTeX math block nodes and code highlighting blocks natively.
- **Alternatives Considered**: 
  - *Raw Markdown Editor (CodeMirror/Monaco)*: High barrier to entry for non-developer learners; lacks the tactile Notion UX.
  - *Slate / Lexical*: Requires building complex block schemas, drag-and-drop handles, and slash menus from scratch.

### 3. Visual Identity & Color System: Warm Editorial (Notion Style)
- **Rationale**: Selected Palette B for a calm, bookish, paper-like aesthetic that minimizes eye strain during hours of technical study and mathematical derivation.
  - **Light Mode**: Warm Cream background (`#FAF9F6`), iconic Notion Charcoal text (`#37352F`), subtle warm paper borders (`#E9E7E2`), and card surfaces (`#FFFFFF`).
  - **Dark Mode**: Muted Charcoal background (`#191919`), warm off-white text (`#E6E4DD`), elevated dark card panels (`#222222`), and soft dividers (`#2E2D29`).
  - **Brand & Primary Accent**: Warm Terracotta / Amber (`#D97706` / `#B45309`) for interactive focus, primary actions, and branding, with Forest Sage (`#059669`) for secondary confirmations.
  - **Callout & Math Styling**: Soft pastel background containers (warm amber/cream tint in light mode, subtle dark bronze/slate tint in dark mode).
  - **Diff & Review Semantics**: Soft Emerald (`#10B981`) for additions, Soft Rose (`#F43F5E`) for deletions, and Warm Ochre (`#F59E0B`) for pending review queues.
- **Typography**: Inter / Geist Sans for clean body prose, JetBrains Mono for code snippets, and KaTeX math fonts.

### 4. Backend & Database: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Rationale**: Supabase provides full-featured PostgreSQL with built-in OAuth/Email authentication, storage buckets for note image attachments, and row-level security policies enforcing authorization directly at the data tier.
- **Data Model**:
  - `profiles`: User metadata and role assignment (`core_team` vs `contributor`).
  - `courses` & `modules`: Hierarchical grouping of notes.
  - `notes`: Metadata container pointing to `current_revision_id`.
  - `revisions`: Immutable snapshots of note blocks (`jsonb`), change summary, and review status (`pending`, `approved`, `rejected`, `direct_publish`).
  - `revision_comments`: Reviewer feedback linked to specific block IDs.

```
+-------------------------------------------------------------------------+
|                              DATA FLOW                                  |
+-------------------------------------------------------------------------+
| 1. User submits note edit -> POST /api/revisions                       |
| 2. Next.js Route Handler / Supabase Client checks user role in DB       |
|    - IF core_team: INSERT revision (approved) & UPDATE note pointer     |
|    - IF contributor: INSERT revision (pending) -> Notify review queue   |
| 3. Core Team reviews -> PATCH /api/revisions/[id]                       |
|    - On Approve: UPDATE revision (approved) & UPDATE note pointer       |
+-------------------------------------------------------------------------+
```

### 5. Block-Level Diffing Algorithm
- **Rationale**: Because notes are stored as structured JSON arrays of blocks (`{ id, type, content, props }`), diffing compares block IDs and content hashes rather than character-by-character line breaks. Reviewers see clear block-level insertions, updates, and removals with inline preview.

## Risks / Trade-offs

- **[Block Schema Changes]** → Future updates to block structure could break legacy revisions. *Mitigation*: Version the block schema in `revisions.blocks_version` and implement migrations on load.
- **[Concurrent Review Conflicts]** → Two contributors propose edits from the same base revision simultaneously. *Mitigation*: The review screen flags when a proposed revision's `base_revision_id` is older than the currently active `current_revision_id`, showing a rebase/merge warning.
- **[Spam / Unauthenticated Edits]** → Anonymous malicious edit proposals flooding the review queue. *Mitigation*: Require authenticated sign-in (GitHub/Google or email) with rate limiting on pending revision submissions.

## Migration Plan

1. Initialize Next.js project with Tailwind CSS, shadcn/ui, and Supabase client.
2. Apply PostgreSQL migration scripts creating schema tables, constraints, and RLS policies.
3. Build the core block editor and reader components.
4. Implement review and diff visualization screens.
5. Seed initial course taxonomy (e.g. AI / Machine Learning Foundations) and publish baseline notes.
