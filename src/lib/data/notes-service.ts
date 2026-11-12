import { createClient } from "@/lib/supabase/client";
import { auth } from "@/lib/firebase/config";
import type { 
  Course, 
  Module, 
  Note, 
  Revision, 
  NoteBlock, 
  Profile, 
  CourseMember, 
  CourseRole,
  CourseWithStats
} from "@/lib/supabase/types";

export interface PendingRevisionItem extends Revision {
  note?: Note;
  author?: Profile;
}

export const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "jatinkumar79911@gmail.com"
).toLowerCase();

function getFirebaseUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in with Google to continue.");
  return user;
}

async function syncProfile(supabase: ReturnType<typeof createClient>, user: ReturnType<typeof getFirebaseUser>) {
  try {
    const isMaster = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
    const { data: existing } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.uid)
      .maybeSingle();

    const roleToSave = isMaster
      ? "super_admin"
      : (existing?.role && existing.role !== "super_admin" ? existing.role : "contributor");

    await supabase.from("profiles").upsert({
      id: user.uid,
      username: user.email?.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "_") || "user",
      display_name: user.displayName || user.email?.split("@")[0] || "User",
      avatar_url: user.photoURL || null,
      role: roleToSave,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking if profiles table has constraints
  }
}

export const notesService = {
  /**
   * Fetches all registered courses
   */
  async getCourses(): Promise<Course[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as Course[];
  },

  /**
   * Fetches all registered courses with module count, note count, member count and creator
   */
  async getCoursesWithDetails(): Promise<CourseWithStats[]> {
    const supabase = createClient();
    const [coursesRes, modulesRes, notesRes, membersRes] = await Promise.all([
      supabase.from("courses").select("*, creator:profiles(*)").order("created_at", { ascending: false }),
      supabase.from("modules").select("id, course_id"),
      supabase.from("notes").select("id, course_id"),
      supabase.from("course_members").select("*, profile:profiles(*)"),
    ]);

    if (coursesRes.error) throw coursesRes.error;
    const courses = (coursesRes.data || []) as (Course & { creator?: Profile })[];
    const modules = (modulesRes.data || []) as { id: string; course_id: string }[];
    const notes = (notesRes.data || []) as { id: string; course_id: string }[];
    const members = (membersRes.data || []) as CourseMember[];

    return courses.map((course) => {
      const courseModules = modules.filter((m) => m.course_id === course.id);
      const courseNotes = notes.filter((n) => n.course_id === course.id);
      const courseMembers = members.filter((m) => m.course_id === course.id);

      return {
        ...course,
        moduleCount: courseModules.length,
        noteCount: courseNotes.length,
        memberCount: courseMembers.length,
        members: courseMembers,
        creator: course.creator || null,
      };
    });
  },

  /**
   * Syncs user profile to Supabase on sign-in
   */
  async syncUserProfile(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }) {
    const supabase = createClient();
    await syncProfile(supabase, user as ReturnType<typeof getFirebaseUser>);
  },

  /**
   * Fetches modules and notes for a specific course
   */
  async getCourseWithModulesAndNotes(courseId: string) {
    const supabase = createClient();
    const [modulesRes, notesRes] = await Promise.all([
      supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true }),
      supabase
        .from("notes")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true }),
    ]);

    if (modulesRes.error) throw modulesRes.error;
    if (notesRes.error) throw notesRes.error;

    return {
      modules: (modulesRes.data || []) as Module[],
      notes: (notesRes.data || []) as Note[],
    };
  },

  /**
   * Fetches a note along with its currently active revision
   */
  async getNote(noteId: string) {
    const supabase = createClient();
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();
    if (noteError) throw noteError;

    let currentRevision: Revision | null = null;
    if (note.current_revision_id) {
      let { data: rev, error: revError } = await supabase
        .from("revisions")
        .select("*, author:profiles!revisions_author_id_fkey(*)")
        .eq("id", note.current_revision_id)
        .maybeSingle();

      if (revError) {
        // Fallback to simple select without join if relationship ambiguous
        const { data: simpleRev } = await supabase
          .from("revisions")
          .select("*")
          .eq("id", note.current_revision_id)
          .maybeSingle();
        rev = simpleRev;
      }

      currentRevision = rev as Revision;
    }

    // Extract PDF metadata from revision blocks if DB table hasn't migrated columns yet
    const typedNote = note as Note;
    if (!typedNote.pdf_url) {
      const pdfBlock = currentRevision?.blocks?.find((b: any) => b?.props?.pdf_url);
      if (pdfBlock) {
        typedNote.pdf_url = (pdfBlock.props as any).pdf_url;
        typedNote.pdf_name = (pdfBlock.props as any).pdf_name;
      }
    }

    return {
      note: typedNote,
      currentRevision,
    };
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
  }) {
    const supabase = createClient();
    const user = getFirebaseUser();
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin) {
      throw new Error("Only the Super Admin can create courses.");
    }
    await syncProfile(supabase, user);

    const { data, error } = await supabase
      .from("courses")
      .insert({
        ...course,
        created_by: user.uid,
      })
      .select()
      .single();
    if (error) throw error;

    // Automatically make creator an admin in course_members
    try {
      await supabase.from("course_members").insert({
        course_id: data.id,
        user_id: user.uid,
        role: "admin",
      });
    } catch {
      // Non-blocking fallback
    }

    return data as Course;
  },

  /**
   * Deletes a course (and cascades to its modules, notes, revisions, and members)
   */
  async deleteCourse(courseId: string): Promise<void> {
    const supabase = createClient();
    const user = getFirebaseUser();
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

    if (!isSuperAdmin) {
      const { data: course } = await supabase
        .from("courses")
        .select("created_by")
        .eq("id", courseId)
        .single();
      if (!course || course.created_by !== user.uid) {
        throw new Error("Only the Super Admin or course creator can delete this course.");
      }
    }

    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) throw error;
  },

  /**
   * Creates a module in a course
   */
  async createModule(mod: {
    course_id: string;
    title: string;
    slug: string;
    order_index?: number;
  }) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("modules")
      .insert(mod)
      .select()
      .single();
    if (error) throw error;
    return data as Module;
  },

  /**
   * Deletes a module in a course
   */
  async deleteModule(moduleId: string): Promise<void> {
    const supabase = createClient();
    const user = getFirebaseUser();
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

    if (!isSuperAdmin) {
      const { data: mod } = await supabase
        .from("modules")
        .select("course_id")
        .eq("id", moduleId)
        .single();
      if (mod) {
        const role = await notesService.getUserCourseRole(mod.course_id);
        if (role !== "admin" && role !== "editor") {
          throw new Error("Only course maintainers or the Super Admin can delete modules.");
        }
      }
    }

    const { error } = await supabase.from("modules").delete().eq("id", moduleId);
    if (error) throw error;
  },

  /**
   * Updates a module's title and slug
   */
  async updateModule(moduleId: string, updates: { title: string; slug?: string }): Promise<Module> {
    const supabase = createClient();
    const user = getFirebaseUser();
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

    if (!isSuperAdmin) {
      const { data: mod } = await supabase
        .from("modules")
        .select("course_id")
        .eq("id", moduleId)
        .single();
      if (mod) {
        const role = await notesService.getUserCourseRole(mod.course_id);
        if (role !== "admin" && role !== "editor") {
          throw new Error("Only course maintainers or the Super Admin can edit modules.");
        }
      }
    }

    const slug = updates.slug || updates.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const { data, error } = await supabase
      .from("modules")
      .update({
        title: updates.title,
        slug,
      })
      .eq("id", moduleId)
      .select()
      .single();

    if (error) throw error;
    return data as Module;
  },

  /**
   * Updates a note's title, slug, and attached PDF
   */
  async updateNote(noteId: string, updates: { title?: string; slug?: string; pdf_url?: string | null; pdf_name?: string | null }): Promise<Note> {
    const supabase = createClient();
    const user = getFirebaseUser();
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

    if (!isSuperAdmin) {
      const { data: note } = await supabase
        .from("notes")
        .select("course_id")
        .eq("id", noteId)
        .single();
      if (note) {
        const role = await notesService.getUserCourseRole(note.course_id);
        if (role !== "admin" && role !== "editor") {
          throw new Error("Only course maintainers or the Super Admin can edit notes.");
        }
      }
    }

    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title) {
      payload.title = updates.title;
      payload.slug = updates.slug || updates.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    if (updates.pdf_url !== undefined) {
      payload.pdf_url = updates.pdf_url;
    }
    if (updates.pdf_name !== undefined) {
      payload.pdf_name = updates.pdf_name;
    }

    let updatedNote: any = null;
    const { data, error } = await supabase
      .from("notes")
      .update(payload)
      .eq("id", noteId)
      .select()
      .single();

    if (error) {
      // Graceful fallback if database has not run migration 004 yet
      if (error.message?.includes("schema cache") || error.code === "PGRST204") {
        delete payload.pdf_url;
        delete payload.pdf_name;
        const { data: retryData, error: retryError } = await supabase
          .from("notes")
          .update(payload)
          .eq("id", noteId)
          .select()
          .single();
        if (retryError) throw retryError;
        updatedNote = {
          ...retryData,
          pdf_url: updates.pdf_url || null,
          pdf_name: updates.pdf_name || null,
        };
      } else {
        throw error;
      }
    } else {
      updatedNote = data;
    }

    return updatedNote as Note;
  },

  /**
   * Uploads a lecture note PDF to storage
   */
  async uploadPdf(file: File, courseId: string, noteId: string): Promise<string> {
    const supabase = createClient();
    const filePath = `${courseId}/${noteId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    try {
      const { error } = await supabase.storage.from("course-pdfs").upload(filePath, file, {
        upsert: true,
        contentType: "application/pdf",
      });
      if (!error) {
        const { data: publicData } = supabase.storage.from("course-pdfs").getPublicUrl(filePath);
        return publicData.publicUrl;
      }
    } catch (err) {
      console.warn("Storage upload error, using local object URL", err);
    }
    return URL.createObjectURL(file);
  },

  /**
   * Creates a note in a course/module
   */
  async createNote(note: {
    course_id: string;
    module_id?: string;
    title: string;
    slug: string;
    pdf_url?: string | null;
    pdf_name?: string | null;
    initialBlocks?: NoteBlock[];
  }) {
    const supabase = createClient();
    const user = getFirebaseUser();
    await syncProfile(supabase, user);

    // 1. Verify module_id exists in database for this course
    let validModuleId: string | null = null;
    if (note.module_id) {
      const { data: modCheck } = await supabase
        .from("modules")
        .select("id")
        .eq("id", note.module_id)
        .eq("course_id", note.course_id)
        .maybeSingle();
      if (modCheck?.id) {
        validModuleId = modCheck.id;
      }
    }

    // 2. Insert Note (with fallback if pdf columns not in schema cache)
    const basePayload: any = {
      course_id: note.course_id,
      module_id: validModuleId,
      title: note.title,
      slug: note.slug,
      created_by: user.uid,
    };

    let noteRecord: any = null;
    let columnsSupported = true;

    if (note.pdf_url || note.pdf_name) {
      const fullPayload = {
        ...basePayload,
        pdf_url: note.pdf_url || null,
        pdf_name: note.pdf_name || null,
      };
      const { data, error } = await supabase
        .from("notes")
        .insert(fullPayload)
        .select()
        .single();

      if (error) {
        if (error.message?.includes("schema cache") || error.code === "PGRST204") {
          columnsSupported = false;
        } else {
          throw error;
        }
      } else {
        noteRecord = data;
      }
    }

    if (!noteRecord) {
      const { data, error } = await supabase
        .from("notes")
        .insert(basePayload)
        .select()
        .single();
      if (error) throw error;
      noteRecord = {
        ...data,
        pdf_url: note.pdf_url || null,
        pdf_name: note.pdf_name || null,
      };
    }

    // 3. Insert initial baseline revision
    const blocks = note.initialBlocks || [
      {
        id: "b_head",
        type: "heading",
        content: note.title,
        props: { level: 1 },
      },
      {
        id: "b_intro",
        type: "paragraph",
        content: "Start writing the notes here. Use the block controls to add headings, mathematics, code blocks, and callouts.",
      },
    ];

    // If database table does not have pdf columns yet, embed in block metadata for persistence
    if (!columnsSupported && (note.pdf_url || note.pdf_name)) {
      blocks.unshift({
        id: "b_pdf_meta",
        type: "html",
        content: "",
        props: {
          pdf_url: note.pdf_url,
          pdf_name: note.pdf_name,
        },
      });
    }

    const { data: rev, error: revError } = await supabase
      .from("revisions")
      .insert({
        note_id: noteRecord.id,
        author_id: user.uid,
        blocks,
        change_summary: "Initial note creation",
        status: "direct_publish",
      })
      .select()
      .single();

    if (!revError && rev) {
      await supabase
        .from("notes")
        .update({ current_revision_id: rev.id })
        .eq("id", noteRecord.id);
      noteRecord.current_revision_id = rev.id;
    }

    return noteRecord as Note;
  },

  /**
   * Deletes a note
   */
  async deleteNote(noteId: string): Promise<void> {
    const supabase = createClient();
    const user = getFirebaseUser();
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

    if (!isSuperAdmin) {
      const { data: note } = await supabase
        .from("notes")
        .select("course_id, created_by")
        .eq("id", noteId)
        .single();
      if (note && note.created_by !== user.uid) {
        const role = await notesService.getUserCourseRole(note.course_id);
        if (role !== "admin" && role !== "editor") {
          throw new Error("Only course maintainers or the Super Admin can delete notes.");
        }
      }
    }

    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) throw error;
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
  }) {
    const supabase = createClient();
    const user = getFirebaseUser();
    await syncProfile(supabase, user);

    const status = data.isDirectPublish ? "direct_publish" : "pending";
    const { data: rev, error: revError } = await supabase
      .from("revisions")
      .insert({
        note_id: data.note_id,
        author_id: user.uid,
        base_revision_id: data.base_revision_id || null,
        blocks: data.blocks,
        change_summary: data.change_summary,
        status,
      })
      .select()
      .single();
    if (revError) throw revError;

    if (data.isDirectPublish) {
      const { error: noteUpdateError } = await supabase
        .from("notes")
        .update({
          current_revision_id: rev.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.note_id);
      if (noteUpdateError) throw noteUpdateError;
    }

    return rev as Revision;
  },

  /**
   * Fetches pending revisions for reviews queue
   */
  async getPendingRevisions(): Promise<PendingRevisionItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("revisions")
      .select("*, author:profiles!revisions_author_id_fkey(*), note:notes(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PendingRevisionItem[];
  },

  /**
   * Approves and merges a revision
   */
  async approveRevision(revisionId: string, noteId: string, notes?: string) {
    const supabase = createClient();
    const user = getFirebaseUser();

    const { error: revError } = await supabase
      .from("revisions")
      .update({
        status: "approved",
        reviewer_id: user.uid,
        reviewer_notes: notes || "Approved and merged into live note.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", revisionId);
    if (revError) throw revError;

    const { error: noteError } = await supabase
      .from("notes")
      .update({
        current_revision_id: revisionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId);
    if (noteError) throw noteError;
  },

  /**
   * Rejects a revision with feedback
   */
  async rejectRevision(revisionId: string, feedback: string) {
    const supabase = createClient();
    const user = getFirebaseUser();

    const { error } = await supabase
      .from("revisions")
      .update({
        status: "rejected",
        reviewer_id: user.uid,
        reviewer_notes: feedback,
        updated_at: new Date().toISOString(),
      })
      .eq("id", revisionId);
    if (error) throw error;
  },

  // -------------------------------------------------------------
  // Course Permissions & Collaborator Access Control API
  // -------------------------------------------------------------

  /**
   * Resolves the effective course-level role of the current user for a given course
   */
  async getUserCourseRole(courseId: string, courseCreatedBy?: string): Promise<CourseRole> {
    const user = auth.currentUser;
    if (!user) return "viewer";

    // 1. Super Admin has unrestricted access everywhere
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
    if (isSuperAdmin) return "admin";

    // 2. Course Creator has admin rights for their own course
    if (courseCreatedBy && courseCreatedBy === user.uid) {
      return "admin";
    }

    const supabase = createClient();

    // 3. Query course_members table
    try {
      const { data, error } = await supabase
        .from("course_members")
        .select("role")
        .eq("course_id", courseId)
        .eq("user_id", user.uid)
        .maybeSingle();

      if (!error && data?.role) {
        return data.role as CourseRole;
      }
    } catch {
      // Fallback
    }

    return "contributor";
  },

  /**
   * Retrieves all collaborator members assigned to a course
   */
  async getCourseMembers(courseId: string): Promise<CourseMember[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("course_members")
      .select("*, profile:profiles(*)")
      .eq("course_id", courseId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as CourseMember[];
  },

  /**
   * Search registered profiles to add as course collaborators
   */
  async searchProfiles(query: string): Promise<Profile[]> {
    if (!query.trim()) return [];
    const supabase = createClient();
    const clean = query.trim().toLowerCase();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%,id.eq.${query.trim()}`)
      .limit(10);

    if (error) throw error;
    return (data || []) as Profile[];
  },

  /**
   * Adds or updates a member's course role (Managed by Super Admin or Course Creator)
   */
  async addCourseMember(courseId: string, userId: string, role: CourseRole): Promise<CourseMember> {
    const supabase = createClient();
    const user = getFirebaseUser();

    // Verify authorized user
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin) {
      const { data: course } = await supabase
        .from("courses")
        .select("created_by")
        .eq("id", courseId)
        .single();
      if (!course || course.created_by !== user.uid) {
        throw new Error("Only the Super Admin or course creator can manage collaborator access.");
      }
    }

    const { data, error } = await supabase
      .from("course_members")
      .upsert(
        {
          course_id: courseId,
          user_id: userId,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_id,user_id" }
      )
      .select("*, profile:profiles(*)")
      .single();

    if (error) throw error;
    return data as CourseMember;
  },

  /**
   * Updates an existing course member's role
   */
  async updateCourseMemberRole(memberId: string, role: CourseRole): Promise<CourseMember> {
    const supabase = createClient();
    const user = getFirebaseUser();

    const { data, error } = await supabase
      .from("course_members")
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)
      .select("*, profile:profiles(*)")
      .single();

    if (error) throw error;
    return data as CourseMember;
  },

  /**
   * Removes a member from a course
   */
  async removeCourseMember(memberId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("course_members")
      .delete()
      .eq("id", memberId);

    if (error) throw error;
  },

  /**
   * Removes a member by course ID and user ID
   */
  async removeCourseEditor(courseId: string, userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("course_members")
      .delete()
      .eq("course_id", courseId)
      .eq("user_id", userId);

    if (error) throw error;
  },

  /**
   * Fetches only the courses the user is authorized to edit in Creator Studio:
   * - Super Admin gets all courses
   * - Course Editors get courses where they have 'admin' or 'editor' role in course_members
   */
  async getUserEditableCourses(userId?: string): Promise<CourseWithStats[]> {
    const user = auth.currentUser;
    const currentUid = userId || user?.uid;
    if (!currentUid) return [];

    const isSuperAdmin = (user?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
    const allCourses = await this.getCoursesWithDetails();
    if (isSuperAdmin) {
      return allCourses;
    }

    const supabase = createClient();
    const { data: memberships, error } = await supabase
      .from("course_members")
      .select("course_id, role")
      .eq("user_id", currentUid);

    if (error) throw error;
    const editableCourseIds = new Set(
      (memberships || [])
        .filter((m) => m.role === "admin" || m.role === "editor")
        .map((m) => m.course_id)
    );

    return allCourses.filter((course) => editableCourseIds.has(course.id) || course.created_by === currentUid);
  },

  /**
   * Evaluates if user can enter Creator Studio
   */
  async canUserAccessStudio(user?: { email?: string | null; uid?: string } | null): Promise<boolean> {
    const activeUser = user || auth.currentUser;
    if (!activeUser) return false;

    if ((activeUser.email || "").toLowerCase() === SUPER_ADMIN_EMAIL) {
      return true;
    }

    if (!activeUser.uid) return false;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("course_members")
      .select("id, role")
      .eq("user_id", activeUser.uid)
      .in("role", ["admin", "editor"])
      .limit(1);

    if (error || !data) return false;
    return data.length > 0;
  },

  /**
   * Evaluates if user can edit a specific course
   */
  async canUserEditCourse(courseId: string, user?: { email?: string | null; uid?: string } | null): Promise<boolean> {
    const activeUser = user || auth.currentUser;
    if (!activeUser) return false;

    if ((activeUser.email || "").toLowerCase() === SUPER_ADMIN_EMAIL) {
      return true;
    }

    if (!activeUser.uid) return false;

    const role = await this.getUserCourseRole(courseId);
    return role === "admin" || role === "editor";
  },

  /**
   * Resolves a registered user profile by email or username
   */
  async findProfileByEmail(email: string): Promise<Profile | null> {
    const clean = email.trim().toLowerCase();
    if (!clean) return null;

    const supabase = createClient();
    const usernamePrefix = clean.split("@")[0].replace(/[^a-z0-9]/g, "_");

    // 1. Try matching exact username
    const { data: byUsername } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", usernamePrefix)
      .maybeSingle();

    if (byUsername) return byUsername as Profile;

    // 2. Try matching display_name or username substring
    const { data: candidates } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${usernamePrefix}%,display_name.ilike.%${usernamePrefix}%`)
      .limit(1);

    if (candidates && candidates.length > 0) {
      return candidates[0] as Profile;
    }

    return null;
  },

  /**
   * Adds an editor to a course by their email
   */
  async addCourseEditorByEmail(courseId: string, email: string): Promise<CourseMember> {
    const profile = await this.findProfileByEmail(email);
    if (!profile) {
      throw new Error(
        `User with identifier "${email}" was not found. Note that users must sign in to Vi-Lekh at least once before they can be added as editors.`
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
    const supabase = createClient();
    const user = getFirebaseUser();
    await syncProfile(supabase, user);

    // 1. Fetch note to get course_id
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, course_id, current_revision_id")
      .eq("id", data.noteId)
      .single();
    if (noteError || !note) throw new Error("Note not found.");

    // 2. Verify authorization
    const isSuperAdmin = (user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
    if (!isSuperAdmin) {
      const role = await notesService.getUserCourseRole(note.course_id);
      if (role !== "admin" && role !== "editor") {
        throw new Error("You do not have permission to edit notes in this course.");
      }
    }

    // 3. Create direct_publish revision
    const { data: rev, error: revError } = await supabase
      .from("revisions")
      .insert({
        note_id: data.noteId,
        author_id: user.uid,
        base_revision_id: note.current_revision_id || null,
        blocks: data.blocks,
        change_summary: data.changeSummary || "Direct publish from editor",
        status: "direct_publish",
      })
      .select()
      .single();
    if (revError) throw revError;

    // 4. Atomically update note title and current revision
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data: updatedNote, error: updateError } = await supabase
      .from("notes")
      .update({
        title: data.title,
        slug,
        current_revision_id: rev.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.noteId)
      .select()
      .single();
    if (updateError) throw updateError;

    return updatedNote as Note;
  },
};
