import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private appInstance: admin.app.App | null = null;

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-vilekh';
    const isEmulatorMode =
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      projectId.startsWith('demo-');

    if (isEmulatorMode) {
      process.env.FIREBASE_AUTH_EMULATOR_HOST =
        process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
      this.logger.log(
        `Firebase Admin configured for local Auth Emulator (Host: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}, Project: ${projectId})`,
      );
    }

    if (admin.apps.length > 0) {
      this.appInstance = admin.app();
      return;
    }

    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !isEmulatorMode) {
        let credential;
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
          credential = admin.credential.cert(serviceAccount);
        } catch {
          credential = admin.credential.cert(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        }
        this.appInstance = admin.initializeApp({ credential, projectId });
      } else {
        this.appInstance = admin.initializeApp({ projectId });
      }
      this.logger.log(`Firebase Admin initialized successfully for project '${projectId}'.`);
    } catch (error) {
      this.logger.warn(`Firebase Admin initialization notice: ${(error as Error).message}`);
    }
  }

  get auth(): admin.auth.Auth {
    return admin.auth();
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return this.auth.verifyIdToken(token);
  }
}
