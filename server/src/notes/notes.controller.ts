import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Public()
  @Get(':id')
  async getNote(@Param('id') id: string) {
    return this.notesService.getNote(id);
  }

  @Post()
  async createNote(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      course_id?: string;
      courseId?: string;
      module_id?: string;
      moduleId?: string;
      title: string;
      slug?: string;
      initialBlocks?: any[];
    },
  ) {
    const courseId = body.courseId || body.course_id;
    const moduleId = body.moduleId || body.module_id;
    return this.notesService.createNote(
      {
        courseId: courseId!,
        moduleId,
        title: body.title,
        slug: body.slug,
        initialBlocks: body.initialBlocks,
      },
      user,
    );
  }

  @Patch(':id')
  async updateNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title: string;
      slug?: string;
      module_id?: string;
      moduleId?: string;
    },
  ) {
    const moduleId = body.moduleId || body.module_id;
    return this.notesService.updateNote(
      id,
      {
        title: body.title,
        slug: body.slug,
        moduleId,
      },
      user,
    );
  }

  @Delete(':id')
  async deleteNote(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.deleteNote(id, user);
  }

  @Post(':id/direct-publish')
  async directPublish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title: string;
      blocks: any[];
      changeSummary?: string;
      change_summary?: string;
    },
  ) {
    return this.notesService.saveNoteDirect(
      {
        noteId: id,
        title: body.title,
        blocks: body.blocks,
        changeSummary: body.changeSummary || body.change_summary,
      },
      user,
    );
  }
}
