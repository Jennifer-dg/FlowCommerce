import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ForgotPasswordUseCase } from '../../application/use-cases/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { ValidateResetTokenUseCase } from '../../application/use-cases/validate-reset-token.use-case';
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
} from '../dto/forgot-password.dto';
import {
  ResetPasswordDto,
  ResetPasswordResponseDto,
  ValidateResetTokenResponseDto,
} from '../dto/reset-password.dto';

// Recuperación de contraseña. Endpoints públicos (sin sesión), coherentes con
// AuthController. El flujo es: forgot → correo con token (30 min, un solo
// uso) → validate → reset, que además revoca las sesiones del usuario.
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class PasswordController {
  constructor(
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly validateResetTokenUseCase: ValidateResetTokenUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  // Responde SIEMPRE 200 con la misma respuesta genérica, exista o no el
  // correo y aunque falle el envío: no debe permitir enumerar usuarios.
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ForgotPasswordResponseDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    await this.forgotPasswordUseCase.execute({ email: dto.email });
    return {
      status: true,
      message:
        'If this email exists in our system, check your email for the reset link',
    };
  }

  // Pre-chequeo del token sin consumirlo. Token inexistente o caducado → 400.
  @Get('reset-password/validate')
  @ApiOkResponse({ type: ValidateResetTokenResponseDto })
  async validateResetToken(
    @Query('token') token?: string,
  ): Promise<ValidateResetTokenResponseDto> {
    if (!token) {
      throw new BadRequestException('token is required');
    }
    const valid = await this.validateResetTokenUseCase.execute({ token });
    if (!valid) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    return { valid: true };
  }

  // Aplica el token (un solo uso, 30 min) y cambia la contraseña. Better Auth
  // revoca todas las sesiones existentes del usuario en el mismo proceso.
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResetPasswordResponseDto })
  resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.resetPasswordUseCase
      .execute({ token: dto.token, password: dto.password })
      .then(() => ({ status: true }));
  }
}
