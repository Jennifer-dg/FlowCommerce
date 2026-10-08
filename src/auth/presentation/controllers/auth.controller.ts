import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { SignUpUseCase } from '../../application/use-cases/sign-up.use-case';
import { SessionCookieService } from '../../infrastructure/session/session-cookie.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { SignUpDto } from '../dto/sign-up.dto';

// Registro e inicio de sesión de usuario. Establece la cookie de sesión firmada.
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly sessionCookieService: SessionCookieService,
  ) {}

  // Alta de usuario; devuelve el usuario y fija la cookie de sesión.
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: AuthResponseDto })
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, token } = await this.signUpUseCase.execute(dto);
    const cookie = await this.sessionCookieService.build(token);
    res.cookie(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
    });
    return { user };
  }

  // Inicio de sesión; devuelve el usuario y fija la cookie de sesión.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, token } = await this.loginUseCase.execute(dto);
    // «Recordarme» → cookie con Max-Age; si no, cookie de sesión del navegador.
    const cookie = await this.sessionCookieService.build(token, {
      persistent: dto.rememberMe === true,
    });
    res.cookie(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      secure: cookie.secure,
      path: cookie.path,
      ...(cookie.maxAge !== undefined ? { maxAge: cookie.maxAge } : {}),
    });
    return { user };
  }
}
