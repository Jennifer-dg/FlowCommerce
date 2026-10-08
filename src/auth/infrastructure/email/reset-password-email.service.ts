import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_SENDER } from '../../application/ports/email-sender';
import type { EmailSender } from '../../application/ports/email-sender';
import type { ResetPasswordEmailData } from '../better-auth/create-better-auth';

// Intervalo mínimo entre correos de recuperación para el mismo usuario: si se
// repite la solicitud antes de 60 s no se reenvía (el token ya emitido sigue
// vigente). Es un control por proceso, suficiente para frenar el abuso.
const RESET_EMAIL_MIN_INTERVAL_MS = 60_000;

// Construye y envía el enlace de recuperación de contraseña. Inyectado en
// Better Auth como emailAndPassword.sendResetPassword.
@Injectable()
export class ResetPasswordEmailService {
  private readonly logger = new Logger(ResetPasswordEmailService.name);
  private readonly lastSentAt = new Map<string, number>();

  constructor(
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  async send(data: ResetPasswordEmailData, appUrl: string): Promise<void> {
    const now = Date.now();
    const last = this.lastSentAt.get(data.user.id);
    if (last !== undefined && now - last < RESET_EMAIL_MIN_INTERVAL_MS) {
      this.logger.warn(
        `Password reset email suppressed for user ${data.user.id}: sent less than 60s ago`,
      );
      return;
    }

    const link = `${appUrl}/reset-password?token=${encodeURIComponent(data.token)}`;
    // Mensaje neutro a propósito: el mismo enlace se usa para restablecer la
    // contraseña (forgot-password) y para establecerla por primera vez
    // (aprobación de una solicitud de acceso). Nunca se manda la contraseña.
    await this.emailSender.send({
      to: data.user.email,
      subject: 'Tu enlace de contraseña de FlowCommerce',
      text: [
        `Hola ${data.user.name},`,
        '',
        'Usa este enlace para elegir tu contraseña (válido durante 30 minutos):',
        '',
        link,
        '',
        'Si no solicitaste este enlace, ignora este mensaje.',
      ].join('\n'),
      html: [
        `<p>Hola ${data.user.name},</p>`,
        `<p><a href="${link}">Haz clic aquí para elegir tu contraseña</a> ` +
          '(válido durante 30 minutos).</p>',
        '<p>Si no solicitaste este enlace, ignora este mensaje.</p>',
      ].join('\n'),
    });

    this.lastSentAt.set(data.user.id, now);
    // Poda de entradas ya caducadas para que el mapa no crezca sin límite.
    for (const [userId, sentAt] of this.lastSentAt) {
      if (now - sentAt >= RESET_EMAIL_MIN_INTERVAL_MS) {
        this.lastSentAt.delete(userId);
      }
    }
  }
}
