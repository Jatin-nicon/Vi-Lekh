import {
  Controller,
  Get,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('sync')
  async sync(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { displayName?: string; avatarUrl?: string },
  ) {
    return this.profilesService.syncProfile({
      uid: user.uid,
      email: user.email,
      displayName: body.displayName || user.name,
      picture: body.avatarUrl || user.picture,
    });
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getMe(user.uid);
  }

  @Public()
  @Get('search')
  async search(@Query('q') query: string) {
    return this.profilesService.searchProfiles(query || '');
  }

  @Public()
  @Get('by-email')
  async findByEmail(@Query('email') email: string) {
    return this.profilesService.findByEmail(email || '');
  }
}
