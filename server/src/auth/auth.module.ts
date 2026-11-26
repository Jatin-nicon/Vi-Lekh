import { Global, Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CourseRoleGuard } from '../common/guards/course-role.guard';

@Global()
@Module({
  providers: [FirebaseAdminService, FirebaseAuthGuard, RolesGuard, CourseRoleGuard],
  exports: [FirebaseAdminService, FirebaseAuthGuard, RolesGuard, CourseRoleGuard],
})
export class AuthModule {}
