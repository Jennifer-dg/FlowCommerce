import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Database } from '../../../db';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import { PasswordHasherService } from '../../application/services/password-hasher.service';
import { createBetterAuth } from './create-better-auth';

// Provider que levanta la instancia única de Better Auth desde la configuración.
@Injectable()
export class BetterAuthProvider {
  readonly instance: ReturnType<typeof createBetterAuth>;

  constructor(
    @Inject(DATABASE_CLIENT) db: Database,
    configService: ConfigService,
    passwordHasher: PasswordHasherService,
  ) {
    const secret = configService.getOrThrow<string>('BETTER_AUTH_SECRET');
    const port = configService.get<number>('PORT') ?? 3000;
    const baseURL =
      configService.get<string>('BETTER_AUTH_URL') ??
      `http://localhost:${port}`;

    this.instance = createBetterAuth(db, {
      secret,
      baseURL,
      hash: (plain) => passwordHasher.hash(plain),
      verify: (hash, plain) => passwordHasher.compare(plain, hash),
    });
  }
}
