import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  async createModule(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      course_id?: string;
      courseId?: string;
      title: string;
      slug?: string;
      order_index?: number;
      orderIndex?: number;
    },
  ) {
    const courseId = body.courseId || body.course_id;
    const orderIndex = body.orderIndex ?? body.order_index;
    return this.modulesService.createModule(
      {
        courseId: courseId!,
        title: body.title,
        slug: body.slug,
        orderIndex,
      },
      user,
    );
  }

  @Patch(':id')
  async updateModule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { title: string; slug?: string },
  ) {
    return this.modulesService.updateModule(id, body, user);
  }

  @Delete(':id')
  async deleteModule(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.modulesService.deleteModule(id, user);
  }

  @Post('reorder')
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { courseId: string; orderedIds: string[] },
  ) {
    return this.modulesService.reorderModules(
      body.courseId,
      body.orderedIds,
      user,
    );
  }
}
