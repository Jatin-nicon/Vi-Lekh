import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CourseRole } from '@prisma/client';
import { formatModule } from '../common/serializers';

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async canEditCourse(courseId: string, user: AuthenticatedUser): Promise<boolean> {
    const superAdminEmail = (
      process.env.SUPER_ADMIN_EMAIL || 'admin@vilekh.local'
    ).toLowerCase();
    if ((user.email || '').toLowerCase() === superAdminEmail) return true;

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { createdBy: true },
    });
    if (course && course.createdBy === user.uid) return true;

    const membership = await this.prisma.courseMember.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId: user.uid,
        },
      },
    });

    return (
      membership?.role === CourseRole.ADMIN ||
      membership?.role === CourseRole.EDITOR
    );
  }

  async createModule(
    data: {
      courseId: string;
      title: string;
      slug?: string;
      orderIndex?: number;
    },
    user: AuthenticatedUser,
  ) {
    const allowed = await this.canEditCourse(data.courseId, user);
    if (!allowed) {
      throw new ForbiddenException('Only course editors or admins can create modules.');
    }

    let orderIndex = data.orderIndex;
    if (orderIndex === undefined) {
      const count = await this.prisma.module.count({
        where: { courseId: data.courseId },
      });
      orderIndex = count;
    }

    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const mod = await this.prisma.module.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        slug,
        orderIndex,
      },
    });

    return formatModule(mod);
  }

  async updateModule(
    moduleId: string,
    updates: { title: string; slug?: string },
    user: AuthenticatedUser,
  ) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!mod) {
      throw new NotFoundException('Module not found');
    }

    const allowed = await this.canEditCourse(mod.courseId, user);
    if (!allowed) {
      throw new ForbiddenException('Only course editors or admins can edit modules.');
    }

    const slug =
      updates.slug ||
      updates.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const updated = await this.prisma.module.update({
      where: { id: moduleId },
      data: {
        title: updates.title,
        slug,
      },
    });

    return formatModule(updated);
  }

  async deleteModule(moduleId: string, user: AuthenticatedUser) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });
    if (!mod) return { success: true };

    const allowed = await this.canEditCourse(mod.courseId, user);
    if (!allowed) {
      throw new ForbiddenException('Only course editors or admins can delete modules.');
    }

    await this.prisma.module.delete({
      where: { id: moduleId },
    });

    return { success: true };
  }

  async reorderModules(
    courseId: string,
    orderedIds: string[],
    user: AuthenticatedUser,
  ) {
    const allowed = await this.canEditCourse(courseId, user);
    if (!allowed) {
      throw new ForbiddenException('Only course editors or admins can reorder modules.');
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.module.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );

    return { success: true };
  }
}
