import { auth } from "@/lib/firebase/config";
import { apiClient } from "@/lib/api/api-client";
import {
  INITIAL_COURSE,
  INITIAL_MODULES,
  INITIAL_NOTE,
  INITIAL_REVISION,
  INITIAL_PROFILES,
} from "@/lib/data/notes-store";
import type {
  Course,
  Module,
  Note,
  Revision,
  NoteBlock,
  Profile,
  CourseMember,
  CourseRole,
  CourseWithStats,
} from "@/lib/types/notes";

export interface PendingRevisionItem extends Revision {
  note?: Note;
  author?: Profile;
}

export const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "admin@vilekh.local"
).toLowerCase();

function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return (
    lower === SUPER_ADMIN_EMAIL ||
    lower === "admin@vilekh.local" ||
    lower === "jatinkumar79911@gmail.com"
  );
}

function getFirebaseUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in with Google to continue.");
  return user;
}

export const notesService = {
  /**
   * Fetches all registered courses
   */
  async getCourses(): Promise<Course[]> {
    try {
      return await apiClient.get<Course[]>("/courses");
    } catch (err) {
      console.warn("Backend API not reachable; falling back to initial course:", err);
      return [INITIAL_COURSE];
    }
  },

  /**
   * Fetches all registered courses with module count, note count, member count and creator
   */
  async getCoursesWithDetails(): Promise<CourseWithStats[]> {
    try {
      return await apiClient.get<CourseWithStats[]>("/courses/details");
    } catch (err) {
      console.warn("Backend API not reachable; falling back to demo courses with stats:", err);
      return [
        {
          ...INITIAL_COURSE,
          moduleCount: INITIAL_MODULES.length,
          noteCount: 1,
          memberCount: 1,
          members: [],
          creator: INITIAL_PROFILES["alex-core"],
        },
      ];
    }
  },

  /**
   * Syncs user profile on sign-in
   */
  async syncUserProfile(user: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  }): Promise<Profile> {
    return apiClient.post<Profile>("/profiles/sync", {
      displayName: user.displayName || undefined,
      avatarUrl: user.photoURL || undefined,
    });
  },

  /**
   * Fetches current user profile
   */
  async getMe(): Promise<Profile | null> {
    return apiClient.get<Profile | null>("/profiles/me");
  },

  /**
   * Fetches modules and notes for a specific course
   */
  async getCourseWithModulesAndNotes(courseId: string): Promise<{
    modules: Module[];
    notes: Note[];
  }> {
    try {
      return await apiClient.get<{ modules: Module[]; notes: Note[] }>(
        `/courses/${courseId}/syllabus`,
      );
    } catch (err) {
      console.warn("Backend API not reachable; falling back to demo syllabus:", err);
      return {
        modules: INITIAL_MODULES,
        notes: [INITIAL_NOTE],
      };
    }
  },

  /**
   * Fetches a note along with its currently active revision
   */
  async getNote(noteId: string): Promise<{
    note: Note;
    currentRevision: Revision | null;
  }> {
    try {
      return await apiClient.get<{ note: Note; currentRevision: Revision | null }>(
        `/notes/${noteId}`,
      );
    } catch (err) {
      console.warn("Backend API not reachable; falling back to demo note:", err);
      return {
        note: INITIAL_NOTE,
        currentRevision: INITIAL_REVISION,
      };
    }
  },

  /**
   * Creates a new course (Restricted strictly to Super Admin)
   */
  async createCourse(course: {
    title: string;
    slug: string;
    description: string;
    domain?: string;
    icon?: string;
  }): Promise<Course> {
    return apiClient.post<Course>("/courses", course);
  },

  /**
   * Deletes a course (and cascades to its modules, notes, revisions, and members)
   */
  async deleteCourse(courseId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}`);
  },

  /**
   * Creates a module in a course
   */
  async createModule(mod: {
    course_id: string;
    title: string;
    slug: string;
    order_index?: number;
  }): Promise<Module> {
    return apiClient.post<Module>("/modules", mod);
  },

  /**
   * Deletes a module in a course
   */
  async deleteModule(moduleId: string): Promise<void> {
    await apiClient.delete(`/modules/${moduleId}`);
  },

  /**
   * Updates a module's title and slug
   */
  async updateModule(
    moduleId: string,
    updates: { title: string; slug?: string },
  ): Promise<Module> {
    return apiClient.patch<Module>(`/modules/${moduleId}`, updates);
  },

  /**
   * Updates a note's title and slug
   */
  async updateNote(
    noteId: string,
    updates: { title: string; slug?: string; module_id?: string },
  ): Promise<Note> {
    return apiClient.patch<Note>(`/notes/${noteId}`, updates);
  },

  /**
   * Creates a note in a course/module
   */
  async createNote(note: {
    course_id: string;
    module_id?: string;
    title: string;
    slug: string;
    initialBlocks?: NoteBlock[];
  }): Promise<Note> {
    return apiClient.post<Note>("/notes", note);
  },

  /**
   * Deletes a note
   */
  async deleteNote(noteId: string): Promise<void> {
    await apiClient.delete(`/notes/${noteId}`);
  },

  /**
   * Submits a revision (either direct publish or pending peer review)
   */
  async submitRevision(data: {
    note_id: string;
    base_revision_id?: string;
    blocks: NoteBlock[];
    change_summary: string;
    isDirectPublish: boolean;
  }): Promise<Revision> {
    return apiClient.post<Revision>("/revisions", data);
  },

  /**
   * Fetches pending revisions for reviews queue
   */
  async getPendingRevisions(): Promise<PendingRevisionItem[]> {
    return apiClient.get<PendingRevisionItem[]>("/revisions/pending");
  },

  /**
   * Approves and merges a revision
   */
  async approveRevision(
    revisionId: string,
    noteId: string,
    notes?: string,
  ): Promise<void> {
    await apiClient.post(`/revisions/${revisionId}/approve`, {
      noteId,
      notes,
    });
  },

  /**
   * Rejects a revision with feedback
   */
  async rejectRevision(revisionId: string, feedback: string): Promise<void> {
    await apiClient.post(`/revisions/${revisionId}/reject`, {
      feedback,
    });
  },

  // -------------------------------------------------------------
  // Course Permissions & Collaborator Access Control API
  // -------------------------------------------------------------

  /**
   * Resolves the effective course-level role of the current user for a given course
   */
  async getUserCourseRole(
    courseId: string,
    courseCreatedBy?: string,
  ): Promise<CourseRole> {
    const user = auth.currentUser;
    if (!user) return "viewer";

    if (isSuperAdminEmail(user.email)) return "admin";

    if (courseCreatedBy && courseCreatedBy === user.uid) {
      return "admin";
    }

    try {
      const res = await apiClient.get<{ role: CourseRole }>(
        `/courses/${courseId}/my-role`,
      );
      return res?.role || "contributor";
    } catch {
      return isSuperAdminEmail(user.email) ? "admin" : "contributor";
    }
  },

  /**
   * Retrieves all collaborator members assigned to a course
   */
  async getCourseMembers(courseId: string): Promise<CourseMember[]> {
    return apiClient.get<CourseMember[]>(`/courses/${courseId}/members`);
  },

  /**
   * Search registered profiles to add as course collaborators
   */
  async searchProfiles(query: string): Promise<Profile[]> {
    if (!query.trim()) return [];
    return apiClient.get<Profile[]>(
      `/profiles/search?q=${encodeURIComponent(query.trim())}`,
    );
  },

  /**
   * Adds or updates a member's course role (Managed by Super Admin or Course Creator)
   */
  async addCourseMember(
    courseId: string,
    userId: string,
    role: CourseRole,
  ): Promise<CourseMember> {
    return apiClient.post<CourseMember>(`/courses/${courseId}/members`, {
      userId,
      role,
    });
  },

  /**
   * Updates an existing course member's role
   */
  async updateCourseMemberRole(
    memberId: string,
    role: CourseRole,
  ): Promise<CourseMember> {
    return apiClient.patch<CourseMember>(`/courses/members/${memberId}`, {
      role,
    });
  },

  /**
   * Removes a member from a course
   */
  async removeCourseMember(memberId: string): Promise<void> {
    await apiClient.delete(`/courses/members/${memberId}`);
  },

  /**
   * Removes a member by course ID and user ID
   */
  async removeCourseEditor(courseId: string, userId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}/members/user/${userId}`);
  },

  /**
   * Fetches only the courses the user is authorized to edit in Creator Studio
   */
  async getUserEditableCourses(userId?: string): Promise<CourseWithStats[]> {
    const user = auth.currentUser;
    const currentUid = userId || user?.uid;
    if (!currentUid) return [];

    try {
      const res = await apiClient.get<CourseWithStats[]>("/courses/user-editable");
      if (res && res.length > 0) return res;
    } catch {
      // Non-blocking fallback
    }

    if (isSuperAdminEmail(user?.email)) {
      return await this.getCoursesWithDetails();
    }
    return [];
  },

  /**
   * Evaluates if user can enter Creator Studio
   */
  async canUserAccessStudio(
    user?: { email?: string | null; uid?: string } | null,
  ): Promise<boolean> {
    const activeUser = user || auth.currentUser;
    if (!activeUser) return false;

    if (isSuperAdminEmail(activeUser.email)) {
      return true;
    }

    if (!activeUser.uid) return false;

    const editable = await this.getUserEditableCourses(activeUser.uid);
    return editable.length > 0;
  },

  /**
   * Evaluates if user can edit a specific course
   */
  async canUserEditCourse(
    courseId: string,
    user?: { email?: string | null; uid?: string } | null,
  ): Promise<boolean> {
    const activeUser = user || auth.currentUser;
    if (!activeUser) return false;

    if (isSuperAdminEmail(activeUser.email)) {
      return true;
    }

    if (!activeUser.uid) return false;

    const role = await this.getUserCourseRole(courseId);
    return role === "admin" || role === "editor";
  },

  /**
   * Updates an existing course's metadata (Super Admin only)
   */
  async updateCourse(
    courseId: string,
    data: Partial<Pick<Course, "title" | "slug" | "description" | "domain" | "icon">>,
  ): Promise<Course> {
    return apiClient.patch<Course>(`/courses/${courseId}`, data);
  },

  /**
   * Resolves a registered user profile by email or username
   */
  async findProfileByEmail(email: string): Promise<Profile | null> {
    const clean = email.trim().toLowerCase();
    if (!clean) return null;

    try {
      return await apiClient.get<Profile | null>(
        `/profiles/by-email?email=${encodeURIComponent(clean)}`,
      );
    } catch {
      return null;
    }
  },

  /**
   * Adds an editor to a course by their email
   */
  async addCourseEditorByEmail(
    courseId: string,
    email: string,
  ): Promise<CourseMember> {
    const profile = await this.findProfileByEmail(email);
    if (!profile) {
      throw new Error(
        `User with identifier "${email}" was not found. Note that users must sign in to Vi-Lekh at least once before they can be added as editors.`,
      );
    }

    return await this.addCourseMember(courseId, profile.id, "editor");
  },

  /**
   * Directly saves and publishes note updates (title & blocks) live without a review queue
   */
  async saveNoteDirect(data: {
    noteId: string;
    title: string;
    blocks: NoteBlock[];
    changeSummary?: string;
  }): Promise<Note> {
    return apiClient.post<Note>(`/notes/${data.noteId}/direct-publish`, data);
  },
};
