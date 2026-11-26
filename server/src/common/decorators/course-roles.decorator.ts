import { SetMetadata } from '@nestjs/common';
import { CourseRole } from '@prisma/client';

export const COURSE_ROLES_KEY = 'courseRoles';
export const RequireCourseRoles = (...roles: CourseRole[]) => SetMetadata(COURSE_ROLES_KEY, roles);
