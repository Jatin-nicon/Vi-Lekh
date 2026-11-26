import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CourseRole, UserRole } from '@prisma/client';
import {
  formatCourse,
  formatModule,
  formatNote,
  formatCourseMember,
} from '../common/serializers';

const DEMO_COURSE = {
  id: 'c1',
  slug: 'machine-learning-foundations',
  title: 'CS229: Machine Learning Foundations',
  description:
    'Comprehensive mathematical and empirical foundations of machine learning, neural networks, and statistical learning theory.',
  domain: 'Artificial Intelligence',
  icon: 'Brain',
  created_by: 'system',
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-05T00:00:00.000Z',
};

const DEMO_MODULES = [
  {
    id: 'm1',
    course_id: 'c1',
    slug: 'optimization',
    title: 'Module 1: Convex Optimization & Gradient Descent',
    order_index: 1,
    created_at: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'm2',
    course_id: 'c1',
    slug: 'neural-networks',
    title: 'Module 2: Neural Networks & Backpropagation',
    order_index: 2,
    created_at: '2026-11-01T00:00:00.000Z',
  },
];

const DEMO_NOTE = {
  id: 'n1',
  course_id: 'c1',
  module_id: 'm2',
  slug: 'cross-entropy-loss',
  title: 'Cross-Entropy Loss & Optimization',
  current_revision_id: 'rev_v1',
  created_by: 'system',
  created_at: '2026-11-01T09:00:00.000Z',
  updated_at: '2026-11-05T14:30:00.000Z',
};

const DEMO_COURSE_WITH_STATS = {
  ...DEMO_COURSE,
  moduleCount: DEMO_MODULES.length,
  noteCount: 1,
  memberCount: 0,
  members: [],
  creator: null,
};

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  constructor(private readonly prisma: PrismaService) {}

  private isSuperAdmin(user?: AuthenticatedUser | null): boolean {
    if (!user) return false;
    const superAdminEmail = (
      process.env.SUPER_ADMIN_EMAIL || 'admin@vilekh.local'
    ).toLowerCase();
    return (user.email || '').toLowerCase() === superAdminEmail;
  }

  async getCourses() {
    try {
      const courses = await this.prisma.course.findMany({
        orderBy: { createdAt: 'asc' },
        include: { creator: true },
      });
      return courses.map(formatCourse);
    } catch (err) {
      this.logger.warn(
        `Database unavailable in getCourses: ${(err as Error).message}`,
      );
      return [DEMO_COURSE];
    }
  }

  async getCoursesWithDetails() {
    try {
      const [courses, modules, notes, members] = await Promise.all([
        this.prisma.course.findMany({
          orderBy: { createdAt: 'desc' },
          include: { creator: true },
        }),
        this.prisma.module.findMany({
          select: { id: true, courseId: true },
        }),
        this.prisma.note.findMany({
          select: { id: true, courseId: true },
        }),
        this.prisma.courseMember.findMany({
          include: { profile: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      return courses.map((course) => {
        const courseModules = modules.filter((m) => m.courseId === course.id);
        const courseNotes = notes.filter((n) => n.courseId === course.id);
        const courseMembers = members.filter((m) => m.courseId === course.id);

        const formatted = formatCourse(course);
        return {
          ...formatted,
          moduleCount: courseModules.length,
          noteCount: courseNotes.length,
          memberCount: courseMembers.length,
          members: courseMembers.map(formatCourseMember),
          creator: formatted?.creator || null,
        };
      });
    } catch (err) {
      this.logger.warn(
        `PostgreSQL database unavailable at localhost:5432. Returning demo course data: ${(err as Error).message}`,
      );
      return [DEMO_COURSE_WITH_STATS];
    }
  }

  async getUserEditableCourses(user: AuthenticatedUser) {
    const allCourses = await this.getCoursesWithDetails();
    if (this.isSuperAdmin(user)) {
      return allCourses;
    }

    const memberships = await this.prisma.courseMember.findMany({
      where: {
        userId: user.uid,
        role: { in: [CourseRole.ADMIN, CourseRole.EDITOR] },
      },
      select: { courseId: true },
    });

    const editableIds = new Set(memberships.map((m) => m.courseId));
    return allCourses.filter(
      (c) => editableIds.has(c.id) || c.created_by === user.uid,
    );
  }

  async getCourseById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { creator: true },
    });
    if (!course) {
      throw new NotFoundException(`Course with id '${id}' not found`);
    }
    return formatCourse(course);
  }

  async getCourseWithModulesAndNotes(courseId: string) {
    try {
      const [modules, notes] = await Promise.all([
        this.prisma.module.findMany({
          where: { courseId },
          orderBy: { orderIndex: 'asc' },
        }),
        this.prisma.note.findMany({
          where: { courseId },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      return {
        modules: modules.map(formatModule),
        notes: notes.map(formatNote),
      };
    } catch (err) {
      this.logger.warn(
        `Database unavailable in getCourseWithModulesAndNotes: ${(err as Error).message}`,
      );
      return {
        modules: DEMO_MODULES,
        notes: [DEMO_NOTE],
      };
    }
  }

  async createCourse(
    data: {
      title: string;
      slug: string;
      description: string;
      domain?: string;
      icon?: string;
    },
    user: AuthenticatedUser,
  ) {
    if (!this.isSuperAdmin(user)) {
      const profile = await this.prisma.profile.findUnique({
        where: { id: user.uid },
      });
      if (profile?.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only the Super Admin can create courses.');
      }
    }

    const course = await this.prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        domain: data.domain || null,
        icon: data.icon || null,
        createdBy: user.uid,
      },
    });

    // Automatically make creator an admin in course_members
    try {
      await this.prisma.courseMember.create({
        data: {
          courseId: course.id,
          userId: user.uid,
          role: CourseRole.ADMIN,
        },
      });
    } catch {
      // Non-blocking if already exists
    }

    return formatCourse(course);
  }

  async deleteCourse(courseId: string, user: AuthenticatedUser) {
    if (!this.isSuperAdmin(user)) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { createdBy: true },
      });
      if (!course || course.createdBy !== user.uid) {
        throw new ForbiddenException(
          'Only the Super Admin or course creator can delete this course.',
        );
      }
    }

    await this.prisma.course.delete({
      where: { id: courseId },
    });

    return { success: true };
  }

  async getUserCourseRole(courseId: string, user?: AuthenticatedUser | null) {
    if (!user) return 'viewer';
    if (this.isSuperAdmin(user)) return 'admin';

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { createdBy: true },
    });

    if (course && course.createdBy === user.uid) {
      return 'admin';
    }

    const membership = await this.prisma.courseMember.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId: user.uid,
        },
      },
    });

    if (membership) {
      return membership.role.toLowerCase();
    }

    return 'contributor';
  }

  // Member management
  async getCourseMembers(courseId: string) {
    const members = await this.prisma.courseMember.findMany({
      where: { courseId },
      include: { profile: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map(formatCourseMember);
  }

  async addCourseMember(
    courseId: string,
    targetUserId: string,
    roleStr: string,
    user: AuthenticatedUser,
  ) {
    if (!this.isSuperAdmin(user)) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { createdBy: true },
      });
      if (!course || course.createdBy !== user.uid) {
        throw new ForbiddenException(
          'Only the Super Admin or course creator can manage collaborator access.',
        );
      }
    }

    const role = (roleStr.toUpperCase() as CourseRole) || CourseRole.CONTRIBUTOR;

    const member = await this.prisma.courseMember.upsert({
      where: {
        courseId_userId: {
          courseId,
          userId: targetUserId,
        },
      },
      update: { role },
      create: {
        courseId,
        userId: targetUserId,
        role,
      },
      include: { profile: true },
    });

    return formatCourseMember(member);
  }

  async updateCourseMemberRole(
    memberId: string,
    roleStr: string,
    user: AuthenticatedUser,
  ) {
    const memberRecord = await this.prisma.courseMember.findUnique({
      where: { id: memberId },
    });
    if (!memberRecord) {
      throw new NotFoundException('Course member not found');
    }

    if (!this.isSuperAdmin(user)) {
      const course = await this.prisma.course.findUnique({
        where: { id: memberRecord.courseId },
        select: { createdBy: true },
      });
      if (!course || course.createdBy !== user.uid) {
        throw new ForbiddenException('Only admins can update member roles');
      }
    }

    const role = (roleStr.toUpperCase() as CourseRole) || CourseRole.CONTRIBUTOR;

    const updated = await this.prisma.courseMember.update({
      where: { id: memberId },
      data: { role },
      include: { profile: true },
    });

    return formatCourseMember(updated);
  }

  async removeCourseMember(memberId: string, user: AuthenticatedUser) {
    const memberRecord = await this.prisma.courseMember.findUnique({
      where: { id: memberId },
    });
    if (!memberRecord) return { success: true };

    if (!this.isSuperAdmin(user)) {
      const course = await this.prisma.course.findUnique({
        where: { id: memberRecord.courseId },
        select: { createdBy: true },
      });
      if (!course || course.createdBy !== user.uid) {
        throw new ForbiddenException('Only admins can remove members');
      }
    }

    await this.prisma.courseMember.delete({
      where: { id: memberId },
    });
    return { success: true };
  }

  async removeCourseMemberByUser(
    courseId: string,
    userId: string,
    user: AuthenticatedUser,
  ) {
    if (!this.isSuperAdmin(user)) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { createdBy: true },
      });
      if (!course || course.createdBy !== user.uid) {
        throw new ForbiddenException('Only admins can remove members');
      }
    }

    await this.prisma.courseMember.deleteMany({
      where: {
        courseId,
        userId,
      },
    });
    return { success: true };
  }
}
