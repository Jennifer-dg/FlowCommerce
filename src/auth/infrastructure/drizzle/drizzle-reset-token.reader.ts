import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, or } from 'drizzle-orm';
import { DATABASE_CLIENT } from '../../../db/database.constants';
import type { Database } from '../../../db';
import { verifications } from '../../../db/schema';
import type {
  ActiveResetToken,
  ResetTokenReader,
} from '../../application/ports/reset-token.reader';
import {
  buildResetTokenIdentifier,
  hashVerificationIdentifier,
} from '../verification/reset-token';

// Lee la fila de verificación del token de recuperación directamente en
// Postgres. Better Auth persiste el identifier hasheado (storeIdentifier
// override de reset-password:), así que se consulta por el hash y, como
// red de seguridad si la configuración cambiara a plain, también en claro.
@Injectable()
export class DrizzleResetTokenReader implements ResetTokenReader {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async findActiveResetToken(token: string): Promise<ActiveResetToken | null> {
    const identifier = buildResetTokenIdentifier(token);

    const rows = await this.db
      .select({ expiresAt: verifications.expiresAt })
      .from(verifications)
      .where(
        and(
          or(
            eq(
              verifications.identifier,
              hashVerificationIdentifier(identifier),
            ),
            eq(verifications.identifier, identifier),
          ),
          gt(verifications.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? { expiresAt: row.expiresAt } : null;
  }
}
