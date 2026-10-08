import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { PasswordHasherService } from '../../application/services/password-hasher.service';
import { ResetPasswordEmailService } from '../email/reset-password-email.service';
import { createBetterAuth } from './create-better-auth';

// Provider que levanta la instancia única de Better Auth desde la configuración.
@Injectable()
export class BetterAuthProvider {
  readonly instance: ReturnType<typeof createBetterAuth>;

  constructor(
    @Inject(DATABASE_CLIENT) db: Database,
    configService: ConfigService,
    passwordHasher: PasswordHasherService,
    resetPasswordEmailService: ResetPasswordEmailService,
  ) {
    const secret = configService.getOrThrow<string>('BETTER_AUTH_SECRET');
    const port = configService.get<number>('PORT') ?? 3000;
    const baseURL =
      configService.get<string>('BETTER_AUTH_URL') ??
      `http://localhost:${port}`;

    // APP_URL es la base del enlace de recuperación que llega por correo.
    // En producción es obligatoria: sin ella el enlace apuntaría mal.
    let appUrl = configService.get<string>('APP_URL');
    if (!appUrl) {
      if (configService.get<string>('NODE_ENV') === 'production') {
        throw new Error(
          'Invalid email configuration: APP_URL is required in production',
        );
      }
      appUrl = `http://localhost:${port}`;
    }

    this.instance = createBetterAuth(db, {
      secret,
      baseURL,
      hash: (plain) => passwordHasher.hash(plain),
      verify: (hash, plain) => passwordHasher.compare(plain, hash),
      // Los fallos de envío los registra Better Auth y el endpoint de
      // forgot-password responde 200 de todos modos (anti-enumeración).
      sendResetPassword: (data) => resetPasswordEmailService.send(data, appUrl),
    });
  }
}
