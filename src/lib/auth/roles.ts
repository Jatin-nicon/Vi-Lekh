import { notesService, SUPER_ADMIN_EMAIL } from "@/lib/data/notes-service";

export { SUPER_ADMIN_EMAIL };

/**
 * Checks if the given user is the platform Super Admin
 */
export function isSuperAdmin(user?: { email?: string | null } | null): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

/**
 * Determines whether the user is authorized to access Creator Studio (/studio).
 * Authorized if:
 * 1. User is Super Admin, OR
 * 2. User has an active 'admin' or 'editor' role in course_members for at least one course.
 */
export async function checkStudioAccess(
  user?: { email?: string | null; uid?: string } | null
): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return await notesService.canUserAccessStudio(user);
}

/**
 * Determines whether the user is authorized to edit a specific course and its notes.
 * Authorized if:
 * 1. User is Super Admin, OR
 * 2. User is assigned as 'admin' or 'editor' for this specific course.
 */
export async function checkCourseEditAccess(
  courseId: string,
  user?: { email?: string | null; uid?: string } | null
): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return await notesService.canUserEditCourse(courseId, user);
}

