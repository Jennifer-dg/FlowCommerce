import { Inject, Injectable, Logger } from '@nestjs/common';
import { normalizeEmail } from '../../../common/utils/user.mapper';
import { SESSION_MANAGER } from '../ports/session-manager';
import type { SessionManager } from '../ports/session-manager';

export interface ForgotPasswordInput {
  email: string;
}

// Solicita el envío del enlace de recuperación. El contrato con el exterior
// es siempre éxito: Better Auth responde de forma genérica exista o no el
// correo y aquí también se tragan los fallos de envío, para no convertir el
// endpoint en un oráculo de usuarios ni en una fuente de errores 500. Los
// problemas reales quedan en el log del servidor.
@Injectable()
export class ForgotPasswordUseCase {
  private readonly logger = new Logger(ForgotPasswordUseCase.name);

  constructor(
    @Inject(SESSION_MANAGER)
    private readonly sessionManager: SessionManager,
  ) {}

  async execute(input: ForgotPasswordInput): Promise<void> {
    try {
      await this.sessionManager.requestPasswordReset({
        email: normalizeEmail(input.email),
      });
    } catch (error) {
      this.logger.error(`Password reset request failed: ${String(error)}`);
    }
  }
}
