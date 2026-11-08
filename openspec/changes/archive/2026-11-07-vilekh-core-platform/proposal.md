# Proposal

## Why

Technical subjects such as AI and university coursework require structured, collaborative, and mathematically rigorous documentation. Traditional wikis (e.g., Wikipedia) suffer from vandalism and lack modern block-based rich text (e.g., KaTeX math, syntax-highlighted code), while developer platforms like GitHub present high friction for non-developer students and educators. Vi-Lekh bridges this gap by providing a Notion-style, block-based collaborative notes platform backed by Supabase with a hybrid review gate where community edits are vetted by a central Core Team before publishing.

## What Changes

- **Notion-Style Block Editing**: Rich WYSIWYG editing supporting drag-and-drop handles, slash commands (`/`), KaTeX math equations, syntax-highlighted code blocks, and callout boxes.
- **Hybrid Flagged Revisions Workflow**:
  - Core Team edits publish immediately to the live note while generating a version history entry.
  - Community / contributor edits generate a pending revision placed into the Core Team review queue.
  - Visual block-level diffing and review actions (Approve & Publish, Request Edits, Reject).
- **Course & Topic Catalog**: Hierarchical organization of knowledge by domains, courses, modules, and individual notes.
- **Role-Based Access & Backend Infrastructure**: Supabase PostgreSQL database with Row Level Security (RLS), Supabase Auth (OAuth/Email), and asset storage for embedded media.

## Capabilities

### New Capabilities
- `note-editor`: Notion-style block editor supporting slash commands, KaTeX formulas, code highlighting, and structured JSON block storage.
- `review-workflow`: Revision versioning, community edit proposal staging, block-level visual diffing, and Core Team review lifecycle (Approve/Merge, Request Changes, Reject).
- `course-catalog`: Hierarchical categorization and discovery of notes across domains, courses, and modules.
- `access-control`: Authentication, user profiles, role enforcement (`core_team` vs `contributor`), and Supabase Row Level Security (RLS) policies.

### Modified Capabilities
None. (Fresh greenfield project).

## Impact

- **Frontend**: Next.js App Router application with Tailwind CSS, shadcn/ui, BlockNote/TipTap editor, and KaTeX rendering.
- **Backend & Data**: Supabase PostgreSQL schema with tables (`profiles`, `courses`, `notes`, `revisions`, `revision_comments`) and RLS policies.
- **Dependencies**: `@blocknote/react`, `@blocknote/mantine` (or Novel/TipTap), `@supabase/supabase-js`, `katex`, `shiki`/`prismjs`.

