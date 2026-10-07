import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConflictException } from '../../../common/exceptions/domain.exceptions';
import { normalizeEmail } from '../../../common/utils/user.mapper';
import { getApiErrorCode } from '../../../common/utils/better-auth.error';
import { SESSION_MANAGER } from '../ports/session-manager';
import type { SessionManager } from '../ports/session-manager';
import type { SignUpSessionInput } from '../../domain/session.types';

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class SignUpUseCase {
  private readonly logger = new Logger(SignUpUseCase.name);

  constructor(
    @Inject(SESSION_MANAGER)
    private readonly sessionManager: SessionManager,
  ) {}

  // Registra un nuevo usuario y devuelve su sesión; convierte el error de
  // "email ya registrado" en un conflicto manejable.
  async execute(input: SignUpInput) {
    const sessionInput: SignUpSessionInput = {
      name: input.name,
      email: normalizeEmail(input.email),
      password: input.password,
    };

    try {
      const { user, token } = await this.sessionManager.signUp(sessionInput);
      return { user, token };
    } catch (error) {
      if (getApiErrorCode(error) === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        throw new ConflictException('Email is already registered');
      }
      this.logger.warn(`Sign up failed: ${String(error)}`);
      throw error;
    }
  }
}
