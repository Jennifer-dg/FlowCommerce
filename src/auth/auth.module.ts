import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PasswordHasherService } from './application/services/password-hasher.service';
import { SESSION_MANAGER } from './application/ports/session-manager';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { SignUpUseCase } from './application/use-cases/sign-up.use-case';
import { BetterAuthProvider } from './infrastructure/better-auth/better-auth.provider';
import { BetterAuthSessionManager } from './infrastructure/session/better-auth-session.manager';
import { SessionCookieService } from './infrastructure/session/session-cookie.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { SessionController } from './presentation/controllers/session.controller';
import { AuthenticatedGuard } from './presentation/guards/authenticated.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, SessionController],
  providers: [
    PasswordHasherService,
    BetterAuthProvider,
    {
      provide: SESSION_MANAGER,
      useClass: BetterAuthSessionManager,
    },
    SessionCookieService,
    SignUpUseCase,
    LoginUseCase,
    AuthenticatedGuard,
  ],
  exports: [
    SESSION_MANAGER,
    SessionCookieService,
    AuthenticatedGuard,
    BetterAuthProvider,
  ],
})
export class AuthModule {}
