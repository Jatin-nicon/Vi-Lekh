import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { RevisionsService } from './revisions.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('revisions')
export class RevisionsController {
  constructor(private readonly revisionsService: RevisionsService) {}

  @Post()
  async submitRevision(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      note_id?: string;
      noteId?: string;
      base_revision_id?: string;
      baseRevisionId?: string;
      blocks: any[];
      change_summary?: string;
      changeSummary?: string;
      isDirectPublish?: boolean;
    },
  ) {
    const noteId = body.noteId || body.note_id;
    const baseRevisionId = body.baseRevisionId || body.base_revision_id;
    const changeSummary = body.changeSummary || body.change_summary || '';

    return this.revisionsService.submitRevision(
      {
        noteId: noteId!,
        baseRevisionId,
        blocks: body.blocks,
        changeSummary,
        isDirectPublish: body.isDirectPublish,
      },
      user,
    );
  }

  @Get('pending')
  async getPending() {
    return this.revisionsService.getPendingRevisions();
  }

  @Post(':id/approve')
  async approveRevision(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { noteId?: string; note_id?: string; notes?: string },
  ) {
    const noteId = body.noteId || body.note_id;
    return this.revisionsService.approveRevision(id, noteId!, body.notes || '', user);
  }

  @Post(':id/reject')
  async rejectRevision(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { feedback: string },
  ) {
    return this.revisionsService.rejectRevision(id, body.feedback, user);
  }

  @Public()
  @Get('by-note/:noteId')
  async getByNote(@Param('noteId') noteId: string) {
    return this.revisionsService.getRevisionsByNote(noteId);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { blockId?: string; block_id?: string; comment: string },
  ) {
    const blockId = body.blockId || body.block_id;
    return this.revisionsService.addComment(id, blockId, body.comment, user);
  }
}
