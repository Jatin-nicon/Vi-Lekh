export type UserRole = "super_admin" | "core_team" | "contributor";
export type CourseRole = "admin" | "editor" | "contributor" | "viewer";
export type RevisionStatus = "pending" | "approved" | "rejected" | "direct_publish";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon?: string;
  domain?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  order_index: number;
  created_at: string;
}

export interface Note {
  id: string;
  course_id: string;
  module_id?: string;
  slug: string;
  title: string;
  order_index?: number;
  current_revision_id?: string | null;
  pdf_url?: string | null;
  pdf_name?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CardAccent = "neutral" | "pitfall" | "solution" | "dashed";

export interface ConceptCard {
  id: string;
  icon?: string;
  title: string;
  accent: CardAccent;
  content: string;
  fix?: string;
  inOtherWords?: string;
}

export interface FlowStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  highlighted?: boolean;
}

export interface NoteBlock {
  id: string;
  type: 
    | "paragraph" 
    | "heading" 
    | "code" 
    | "math" 
    | "callout" 
    | "bullet_list" 
    | "numbered_list" 
    | "image"
    | "flow"
    | "your_note"
    | "card_grid"
    | "round_dialogue"
    | "pinned_note"
    | "html";
  content: string;
  props?: {
    level?: number;
    language?: string;
    calloutType?: "info" | "warning" | "tip";
    [key: string]: unknown;
  };
}

export interface Revision {
  id: string;
  /** Published versions are numbered 1, 2, 3… per note; null for unpublished rows. */
  version_number?: number | null;
  note_id: string;
  author_id: string;
  base_revision_id?: string | null;
  blocks: NoteBlock[];
  pdf_url?: string | null;
  pdf_name?: string | null;
  change_summary: string;
  status: RevisionStatus;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
  reviewer?: Profile;
}

export interface RevisionComment {
  id: string;
  revision_id: string;
  author_id: string;
  block_id?: string | null;
  comment: string;
  created_at: string;
  author?: Profile;
}

export interface CourseMember {
  id: string;
  course_id: string;
  user_id: string;
  role: CourseRole;
  created_at: string;
  updated_at?: string;
  profile?: Profile;
}

export interface CourseWithStats extends Course {
  moduleCount: number;
  noteCount: number;
  memberCount: number;
  members: CourseMember[];
  creator?: Profile | null;
}


