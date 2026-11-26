import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.uid) {
      throw new UnauthorizedException('Authentication required for role verification');
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'jatinkumar79911@gmail.com';
    if (user.email && user.email.toLowerCase() === superAdminEmail.toLowerCase()) {
      return true;
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: user.uid },
      select: { role: true },
    });

    if (!profile) {
      throw new ForbiddenException('User profile not found');
    }

    if (profile.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    if (profile.role === UserRole.CORE_TEAM && requiredRoles.includes(UserRole.CONTRIBUTOR)) {
      return true;
    }

    const hasRole = requiredRoles.includes(profile.role);
    if (!hasRole) {
      throw new ForbiddenException(`Insufficient permissions. Required role: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
