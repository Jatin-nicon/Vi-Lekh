import {
  Profile as PrismaProfile,
  Course as PrismaCourse,
  Module as PrismaModule,
  Note as PrismaNote,
  Revision as PrismaRevision,
  CourseMember as PrismaCourseMember,
  RevisionComment as PrismaRevisionComment,
} from '@prisma/client';

export function formatProfile(p: PrismaProfile | null | undefined) {
  if (!p) return null;
  return {
    id: p.id,
    username: p.username,
    display_name: p.displayName,
    avatar_url: p.avatarUrl,
    role: p.role.toLowerCase(),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export function formatCourse(c: (PrismaCourse & { creator?: PrismaProfile | null }) | null | undefined) {
  if (!c) return null;
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    icon: c.icon || undefined,
    domain: c.domain || undefined,
    created_by: c.createdBy || undefined,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    creator: c.creator ? formatProfile(c.creator) : undefined,
  };
}

export function formatModule(m: PrismaModule | null | undefined) {
  if (!m) return null;
  return {
    id: m.id,
    course_id: m.courseId,
    title: m.title,
    slug: m.slug,
    order_index: m.orderIndex,
    created_at: m.createdAt.toISOString(),
  };
}

export function formatNote(n: PrismaNote | null | undefined) {
  if (!n) return null;
  return {
    id: n.id,
    course_id: n.courseId,
    module_id: n.moduleId || undefined,
    slug: n.slug,
    title: n.title,
    current_revision_id: n.currentRevisionId || undefined,
    created_by: n.createdBy,
    created_at: n.createdAt.toISOString(),
    updated_at: n.updatedAt.toISOString(),
  };
}

export function formatRevision(
  r:
    | (PrismaRevision & {
        author?: PrismaProfile | null;
        reviewer?: PrismaProfile | null;
        note?: PrismaNote | null;
      })
    | null
    | undefined,
) {
  if (!r) return null;
  return {
    id: r.id,
    note_id: r.noteId,
    author_id: r.authorId,
    base_revision_id: r.baseRevisionId || undefined,
    blocks: r.blocks,
    change_summary: r.changeSummary,
    status: r.status.toLowerCase(),
    reviewer_id: r.reviewerId || undefined,
    reviewer_notes: r.reviewerNotes || undefined,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    author: r.author ? formatProfile(r.author) : undefined,
    reviewer: r.reviewer ? formatProfile(r.reviewer) : undefined,
    note: r.note ? formatNote(r.note) : undefined,
  };
}

export function formatCourseMember(
  cm: (PrismaCourseMember & { profile?: PrismaProfile | null }) | null | undefined,
) {
  if (!cm) return null;
  return {
    id: cm.id,
    course_id: cm.courseId,
    user_id: cm.userId,
    role: cm.role.toLowerCase(),
    created_at: cm.createdAt.toISOString(),
    updated_at: cm.updatedAt.toISOString(),
    profile: cm.profile ? formatProfile(cm.profile) : undefined,
  };
}

export function formatRevisionComment(
  rc: (PrismaRevisionComment & { author?: PrismaProfile | null }) | null | undefined,
) {
  if (!rc) return null;
  return {
    id: rc.id,
    revision_id: rc.revisionId,
    author_id: rc.authorId,
    block_id: rc.blockId || undefined,
    comment: rc.comment,
    created_at: rc.createdAt.toISOString(),
    author: rc.author ? formatProfile(rc.author) : undefined,
  };
}
