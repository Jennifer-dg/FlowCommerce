import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { RESET_TOKEN_READER } from './application/ports/reset-token.reader';
import { EMAIL_SENDER } from './application/ports/email-sender';
import { PasswordHasherService } from './application/services/password-hasher.service';
import { SESSION_MANAGER } from './application/ports/session-manager';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { SignUpUseCase } from './application/use-cases/sign-up.use-case';
import { ValidateResetTokenUseCase } from './application/use-cases/validate-reset-token.use-case';
import { DrizzleResetTokenReader } from './infrastructure/drizzle/drizzle-reset-token.reader';
import { createEmailSender } from './infrastructure/email/create-email-sender';
import { ResetPasswordEmailService } from './infrastructure/email/reset-password-email.service';
import { BetterAuthProvider } from './infrastructure/better-auth/better-auth.provider';
import { BetterAuthSessionManager } from './infrastructure/session/better-auth-session.manager';
import { SessionCookieService } from './infrastructure/session/session-cookie.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { PasswordController } from './presentation/controllers/password.controller';
import { SessionController } from './presentation/controllers/session.controller';
import { AuthenticatedGuard } from './presentation/guards/authenticated.guard';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, PasswordController, SessionController],
  providers: [
    PasswordHasherService,
    // Transporte de correo: Resend con RESEND_API_KEY/EMAIL_FROM; en
    // producción sin esas variables falla aquí, de forma explícita, y la
    // app no arranca (ver create-email-sender.ts).
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createEmailSender(config),
    },
    ResetPasswordEmailService,
    BetterAuthProvider,
    {
      provide: SESSION_MANAGER,
      useClass: BetterAuthSessionManager,
    },
    {
      provide: RESET_TOKEN_READER,
      useClass: DrizzleResetTokenReader,
    },
    SessionCookieService,
    SignUpUseCase,
    LoginUseCase,
    ForgotPasswordUseCase,
    ValidateResetTokenUseCase,
    ResetPasswordUseCase,
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
