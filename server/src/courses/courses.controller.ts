import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get()
  async getCourses() {
    return this.coursesService.getCourses();
  }

  @Public()
  @Get('details')
  async getCoursesWithDetails() {
    return this.coursesService.getCoursesWithDetails();
  }

  @Get('user-editable')
  async getUserEditableCourses(@CurrentUser() user: AuthenticatedUser) {
    return this.coursesService.getUserEditableCourses(user);
  }

  @Public()
  @Get(':id')
  async getCourseById(@Param('id') id: string) {
    return this.coursesService.getCourseById(id);
  }

  @Public()
  @Get(':id/syllabus')
  async getSyllabus(@Param('id') id: string) {
    return this.coursesService.getCourseWithModulesAndNotes(id);
  }

  @Post()
  async createCourse(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title: string;
      slug: string;
      description: string;
      domain?: string;
      icon?: string;
    },
  ) {
    return this.coursesService.createCourse(body, user);
  }

  @Patch(':id')
  async updateCourse(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title?: string;
      slug?: string;
      description?: string;
      domain?: string;
      icon?: string;
    },
  ) {
    return this.coursesService.updateCourse(id, body, user);
  }

  @Delete(':id')
  async deleteCourse(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.deleteCourse(id, user);
  }

  @Public()
  @Get(':id/my-role')
  async getMyRole(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return { role: await this.coursesService.getUserCourseRole(id, user) };
  }

  @Public()
  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.coursesService.getCourseMembers(id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { userId: string; role: string },
  ) {
    return this.coursesService.addCourseMember(id, body.userId, body.role, user);
  }

  @Patch('members/:memberId')
  async updateMember(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { role: string },
  ) {
    return this.coursesService.updateCourseMemberRole(memberId, body.role, user);
  }

  @Delete('members/:memberId')
  async removeMember(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.removeCourseMember(memberId, user);
  }

  @Delete(':id/members/user/:userId')
  async removeMemberByUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coursesService.removeCourseMemberByUser(id, userId, user);
  }
}
