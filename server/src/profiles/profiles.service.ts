import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { formatProfile } from '../common/serializers';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncProfile(user: {
    uid: string;
    email?: string;
    displayName?: string;
    picture?: string;
  }) {
    const superAdminEmail = (
      process.env.SUPER_ADMIN_EMAIL || 'admin@vilekh.local'
    ).toLowerCase();
    const isSuperAdmin = (user.email || '').toLowerCase() === superAdminEmail;

    const existing = await this.prisma.profile.findUnique({
      where: { id: user.uid },
    });

    let roleToAssign: UserRole = UserRole.CONTRIBUTOR;
    if (isSuperAdmin) {
      roleToAssign = UserRole.SUPER_ADMIN;
    } else if (existing && existing.role !== UserRole.SUPER_ADMIN) {
      roleToAssign = existing.role;
    }

    const defaultUsername = (user.email || 'user')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');

    const profile = await this.prisma.profile.upsert({
      where: { id: user.uid },
      update: {
        displayName: user.displayName || existing?.displayName || defaultUsername,
        avatarUrl: user.picture || existing?.avatarUrl || null,
        role: roleToAssign,
      },
      create: {
        id: user.uid,
        username: defaultUsername,
        displayName: user.displayName || defaultUsername,
        avatarUrl: user.picture || null,
        role: roleToAssign,
      },
    });

    return formatProfile(profile);
  }

  async getMe(uid: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: uid },
    });
    return formatProfile(profile);
  }

  async searchProfiles(query: string) {
    const clean = (query || '').trim().toLowerCase();
    if (!clean) return [];

    const profiles = await this.prisma.profile.findMany({
      where: {
        OR: [
          { username: { contains: clean, mode: 'insensitive' } },
          { displayName: { contains: clean, mode: 'insensitive' } },
          { id: { equals: query.trim() } },
        ],
      },
      take: 10,
    });

    return profiles.map(formatProfile);
  }

  async findByEmail(email: string) {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return null;

    const prefix = clean.split('@')[0].replace(/[^a-z0-9]/g, '_');

    // Exact username match
    const exact = await this.prisma.profile.findFirst({
      where: {
        username: { equals: prefix, mode: 'insensitive' },
      },
    });
    if (exact) return formatProfile(exact);

    // Partial candidate match
    const candidates = await this.prisma.profile.findMany({
      where: {
        OR: [
          { username: { contains: prefix, mode: 'insensitive' } },
          { displayName: { contains: prefix, mode: 'insensitive' } },
        ],
      },
      take: 1,
    });

    if (candidates.length > 0) {
      return formatProfile(candidates[0]);
    }

    return null;
  }
}
