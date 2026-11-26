import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CourseRole, UserRole } from '@prisma/client';
import { COURSE_ROLES_KEY } from '../decorators/course-roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

const ROLE_PRIORITY: Record<CourseRole, number> = {
  ADMIN: 4,
  EDITOR: 3,
  CONTRIBUTOR: 2,
  VIEWER: 1,
};

@Injectable()
export class CourseRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<CourseRole[]>(COURSE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.uid) {
      throw new UnauthorizedException('Authentication required for course role verification');
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'jatinkumar79911@gmail.com';
    if (user.email && user.email.toLowerCase() === superAdminEmail.toLowerCase()) {
      return true;
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: user.uid },
      select: { role: true },
    });
    if (profile?.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const courseId =
      request.params?.courseId ||
      request.params?.id ||
      request.body?.courseId ||
      request.query?.courseId;

    if (!courseId) {
      return true;
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { createdBy: true },
    });

    if (course && course.createdBy === user.uid) {
      return true;
    }

    const membership = await this.prisma.courseMember.findUnique({
      where: {
        courseId_userId: {
          courseId,
          userId: user.uid,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this course');
    }

    const minRequiredLevel = Math.min(...requiredRoles.map((r) => ROLE_PRIORITY[r]));
    const userLevel = ROLE_PRIORITY[membership.role] || 0;

    if (userLevel < minRequiredLevel) {
      throw new ForbiddenException(
        `Insufficient course permissions. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
