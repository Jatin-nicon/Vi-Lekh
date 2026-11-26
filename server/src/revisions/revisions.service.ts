import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RevisionStatus } from '@prisma/client';
import { formatRevision, formatRevisionComment } from '../common/serializers';

@Injectable()
export class RevisionsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitRevision(
    data: {
      noteId: string;
      baseRevisionId?: string;
      blocks: any[];
      changeSummary: string;
      isDirectPublish?: boolean;
    },
    user: AuthenticatedUser,
  ) {
    const note = await this.prisma.note.findUnique({
      where: { id: data.noteId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const status = data.isDirectPublish
      ? RevisionStatus.DIRECT_PUBLISH
      : RevisionStatus.PENDING;

    const revision = await this.prisma.$transaction(async (tx) => {
      const rev = await tx.revision.create({
        data: {
          noteId: data.noteId,
          authorId: user.uid,
          baseRevisionId: data.baseRevisionId || null,
          blocks: data.blocks,
          changeSummary: data.changeSummary || '',
          status,
        },
        include: { author: true },
      });

      if (data.isDirectPublish) {
        await tx.note.update({
          where: { id: data.noteId },
          data: { currentRevisionId: rev.id },
        });
      }

      return rev;
    });

    return formatRevision(revision);
  }

  async getPendingRevisions() {
    const revisions = await this.prisma.revision.findMany({
      where: { status: RevisionStatus.PENDING },
      include: {
        author: true,
        note: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return revisions.map(formatRevision);
  }

  async approveRevision(
    revisionId: string,
    noteId: string,
    notes: string,
    user: AuthenticatedUser,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.revision.update({
        where: { id: revisionId },
        data: {
          status: RevisionStatus.APPROVED,
          reviewerId: user.uid,
          reviewerNotes: notes || 'Approved and merged into live note.',
        },
      });

      await tx.note.update({
        where: { id: noteId },
        data: { currentRevisionId: revisionId },
      });
    });

    return { success: true };
  }

  async rejectRevision(
    revisionId: string,
    feedback: string,
    user: AuthenticatedUser,
  ) {
    await this.prisma.revision.update({
      where: { id: revisionId },
      data: {
        status: RevisionStatus.REJECTED,
        reviewerId: user.uid,
        reviewerNotes: feedback,
      },
    });

    return { success: true };
  }

  async getRevisionsByNote(noteId: string) {
    const revisions = await this.prisma.revision.findMany({
      where: { noteId },
      include: {
        author: true,
        reviewer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return revisions.map(formatRevision);
  }

  async addComment(
    revisionId: string,
    blockId: string | undefined,
    commentText: string,
    user: AuthenticatedUser,
  ) {
    const comment = await this.prisma.revisionComment.create({
      data: {
        revisionId,
        authorId: user.uid,
        blockId: blockId || null,
        comment: commentText,
      },
      include: { author: true },
    });

    return formatRevisionComment(comment);
  }
}
