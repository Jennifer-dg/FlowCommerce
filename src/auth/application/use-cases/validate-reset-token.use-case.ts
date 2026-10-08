import { Inject, Injectable } from '@nestjs/common';
import { RESET_TOKEN_READER } from '../ports/reset-token.reader';
import type { ResetTokenReader } from '../ports/reset-token.reader';

export interface ValidateResetTokenInput {
  token: string;
}

// Comprueba que el token existe y sigue vigente SIN consumirlo, para que el
// frontend pueda validar el enlace antes de mostrar el formulario. El
// consumo real ocurre sólo al aplicar el reset (ResetPasswordUseCase).
@Injectable()
export class ValidateResetTokenUseCase {
  constructor(
    @Inject(RESET_TOKEN_READER)
    private readonly resetTokenReader: ResetTokenReader,
  ) {}

  async execute(input: ValidateResetTokenInput): Promise<boolean> {
    const activeToken = await this.resetTokenReader.findActiveResetToken(
      input.token,
    );
    return activeToken !== null;
  }
}
