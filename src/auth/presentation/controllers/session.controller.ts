import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SESSION_MANAGER } from '../../application/ports/session-manager';
import type { SessionManager } from '../../application/ports/session-manager';
import { SessionCookieService } from '../../infrastructure/session/session-cookie.service';
import { SessionDto } from '../dto/session.dto';

// Consulta la sesión activa y permite cerrarla (logout).
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class SessionController {
  constructor(
    @Inject(SESSION_MANAGER)
    private readonly sessionManager: SessionManager,
    private readonly sessionCookieService: SessionCookieService,
  ) {}

  // Devuelve la sesión activa o 401 si no hay sesión válida.
  @Get('session')
  @ApiOkResponse({ type: SessionDto })
  async getSession(@Req() req: Request): Promise<SessionDto> {
    const session = await this.sessionManager.getSession(this.toHeaders(req));

    if (!session) {
      throw new UnauthorizedException('No active session');
    }

    return {
      user: session.user,
      session: {
        id: session.session.id,
        userId: session.session.userId,
        expiresAt: session.session.expiresAt,
      },
    };
  }

  // Invalida la sesión y borra la cookie del cliente.
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    schema: { type: 'object', properties: { success: { type: 'boolean' } } },
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    await this.sessionManager.signOut(this.toHeaders(req));
    const clear = this.sessionCookieService.clear();
    res.cookie(clear.name, clear.value, {
      httpOnly: clear.httpOnly,
      sameSite: clear.sameSite,
      secure: clear.secure,
      path: clear.path,
      maxAge: clear.maxAge,
    });
    return { success: true };
  }

  private toHeaders(req: Request): Headers {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
    }
    return headers;
  }
}
