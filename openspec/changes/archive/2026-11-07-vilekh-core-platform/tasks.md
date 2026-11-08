# Tasks

## 1. Project Scaffolding & Design System Setup

- [x] 1.1 Initialize Next.js 15 project with TypeScript, Tailwind CSS, and shadcn/ui and verify development server runs cleanly
- [x] 1.2 Configure the Warm Editorial color tokens (Warm Cream `#FAF9F6`, Notion Charcoal `#37352F`, Terracotta/Amber `#D97706`, and Dark Charcoal `#191919`) in Tailwind CSS configuration and verify light/dark theme variables
- [x] 1.3 Configure typography styles with Inter/Geist Sans for prose, JetBrains Mono for code blocks, and KaTeX math stylesheet imports

## 2. Supabase Database & Security Policies

- [x] 2.1 Set up Supabase client utilities and environment variable configurations for client and server actions
- [x] 2.2 Create database schema migration with tables for `profiles`, `courses`, `notes`, `revisions`, and `revision_comments` and verify table constraints
- [x] 2.3 Implement Supabase Row Level Security (RLS) policies distinguishing `core_team` from `contributor` permissions and verify policy restrictions
- [x] 2.4 Configure Supabase Auth integration and automatic profile creation trigger upon user sign-up

## 3. Notion-Style Block Editor & Reader View

- [x] 3.1 Install and integrate the BlockNote editor component with slash command (`/`) menu support
- [x] 3.2 Add custom KaTeX math block support for LaTeX equations and verify inline and block rendering
- [x] 3.3 Configure code blocks with syntax highlighting across Python, JavaScript, and shell commands
- [x] 3.4 Build clean reader view for published notes with responsive floating table of contents and contributor credits

## 4. Hybrid Review & Diff System

- [x] 4.1 Implement note edit submission logic: auto-publish for Core Team members and create pending revisions for contributors
- [x] 4.2 Build block-level visual diff component highlighting added, modified, and removed blocks with semantic colors
- [x] 4.3 Create Core Team review dashboard displaying pending revision queue and contributor notes
- [x] 4.4 Implement review actions (Approve & Merge with atomic note pointer update, Request Changes, and Reject)

## 5. Course Catalog & Navigation

- [x] 5.1 Build hierarchical course navigation sidebar with collapsible modules and active note indicators
- [x] 5.2 Build course landing and module overview pages displaying syllabus structure
- [x] 5.3 Implement search bar allowing users to find notes by title, topic, or course keywords

## 6. Verification & End-to-End Testing

- [x] 6.1 Execute end-to-end contribution test: Contributor submits note revision -> Appears in review queue -> Core Team approves -> Live note updates
- [x] 6.2 Verify Warm Editorial visual contrast, responsive layout on mobile/desktop, and dark mode transitions

