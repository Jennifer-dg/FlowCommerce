import { Inject, Injectable, Logger } from '@nestjs/common';
import { InvalidCredentialsException } from '../../../common/exceptions/domain.exceptions';
import { normalizeEmail } from '../../../common/utils/user.mapper';
import { getApiErrorCode } from '../../../common/utils/better-auth.error';
import { SESSION_MANAGER } from '../ports/session-manager';
import type { SessionManager } from '../ports/session-manager';
import type { SignInSessionInput } from '../../domain/session.types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: {
    id: string;
    name: string;
    email: string;
    creadoEn: Date;
    actualizadoEn: Date;
  };
  token: string;
}

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(SESSION_MANAGER)
    private readonly sessionManager: SessionManager,
  ) {}

  // Autentica al usuario y devuelve su sesión; mapea las credenciales inválidas.
  async execute(input: LoginInput): Promise<LoginResult> {
    const sessionInput: SignInSessionInput = {
      email: normalizeEmail(input.email),
      password: input.password,
    };

    try {
      const { user, token } = await this.sessionManager.signIn(sessionInput);
      return { user, token };
    } catch (error) {
      if (getApiErrorCode(error) === 'INVALID_EMAIL_OR_PASSWORD') {
        throw new InvalidCredentialsException();
      }
      this.logger.warn(`Login failed: ${String(error)}`);
      throw error;
    }
  }
}
