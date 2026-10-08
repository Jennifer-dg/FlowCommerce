import { Inject, Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '../../../common/exceptions/domain.exceptions';
import { getApiErrorCode } from '../../../common/utils/better-auth.error';
import { SESSION_MANAGER } from '../ports/session-manager';
import type { SessionManager } from '../ports/session-manager';

export interface ResetPasswordInput {
  token: string;
  password: string;
}

// Aplica el token de recuperación y guarda la contraseña nueva. Better Auth
// garantiza el un-solo-uso (consumeVerificationValue), la expiración de
// 30 minutos y la revocación de todas las sesiones existentes del usuario
// (revokeSessionsOnPasswordReset). Un token inválido o caducado es un 400.
@Injectable()
export class ResetPasswordUseCase {
  private readonly logger = new Logger(ResetPasswordUseCase.name);

  constructor(
    @Inject(SESSION_MANAGER)
    private readonly sessionManager: SessionManager,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    try {
      await this.sessionManager.resetPassword({
        token: input.token,
        newPassword: input.password,
      });
    } catch (error) {
      const code = getApiErrorCode(error);
      if (
        code === 'INVALID_TOKEN' ||
        code === 'TOKEN_EXPIRED' ||
        code === 'USER_NOT_FOUND'
      ) {
        throw new BadRequestException('Invalid or expired reset token');
      }
      if (code === 'PASSWORD_TOO_SHORT' || code === 'PASSWORD_TOO_LONG') {
        throw new BadRequestException(
          'Password does not meet the requirements',
        );
      }
      this.logger.warn(`Password reset failed: ${String(error)}`);
      throw error;
    }
  }
}
