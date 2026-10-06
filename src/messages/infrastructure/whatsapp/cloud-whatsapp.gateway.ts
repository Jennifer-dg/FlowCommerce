import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BadGatewayException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '../../../common/exceptions/domain.exceptions';
import type {
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResult,
  WhatsAppGateway,
} from '../../domain/ports/whatsapp.gateway';
import { normalizeWhatsAppPhone } from './normalize-phone';
import { isRetryableHttpStatus, retryDelayMs, sleep } from './retry';

export const WHATSAPP_FETCH = Symbol('WHATSAPP_FETCH');

interface GraphMessageResponse {
  messages?: Array<{ id?: string }>;
  error?: {
    message?: string;
    code?: number;
  };
}

// Cliente real de WhatsApp Cloud API (Graph). Las credenciales viven solo en
// variables de entorno: el token nunca se acepta por HTTP ni se persiste.
//
// WHATSAPP_PROJECT_ID, si está definido, ata este número de negocio a un
// único tenant. Así un proyecto vecino con permiso de envío no puede hablar
// por el mismo WABA.
@Injectable()
export class CloudWhatsAppGateway implements WhatsAppGateway {
  private readonly logger = new Logger(CloudWhatsAppGateway.name);
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(WHATSAPP_FETCH)
    fetchImpl?: typeof fetch,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async send(
    input: SendWhatsAppMessageInput,
  ): Promise<SendWhatsAppMessageResult> {
    const token = this.configService.get<string>('WHATSAPP_TOKEN');
    const phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );

    if (!token || !phoneNumberId) {
      throw new ServiceUnavailableException(
        'WhatsApp Cloud API is not configured',
      );
    }

    const boundProjectId = this.configService.get<string>(
      'WHATSAPP_PROJECT_ID',
    );
    if (boundProjectId && boundProjectId !== input.projectId) {
      throw new ForbiddenException(
        'WhatsApp is not configured for this project',
      );
    }

    if (!input.phone) {
      throw new ConflictException(
        'Lead has no phone number, WhatsApp message not sent',
      );
    }

    const to = normalizeWhatsAppPhone(input.phone);
    if (!to) {
      throw new ConflictException(
        'Lead phone number is not a valid WhatsApp destination',
      );
    }

    const version =
      this.configService.get<string>('WHATSAPP_GRAPH_API_VERSION') ?? 'v21.0';
    const baseUrl =
      this.configService.get<string>('WHATSAPP_GRAPH_BASE_URL') ??
      'https://graph.facebook.com';
    const url = `${baseUrl.replace(/\/$/, '')}/${version}/${phoneNumberId}/messages`;

    const maxRetries = Number(
      this.configService.get<string>('WHATSAPP_MAX_RETRIES') ?? 3,
    );
    const retryBaseMs = Number(
      this.configService.get<string>('WHATSAPP_RETRY_BASE_MS') ?? 250,
    );
    const timeoutMs = Number(
      this.configService.get<string>('WHATSAPP_REQUEST_TIMEOUT_MS') ?? 10_000,
    );

    const body = JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: input.content,
      },
    });

    const attempts = Math.max(maxRetries, 0) + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });

        const payload = (await this.parseJson(
          response,
        )) as GraphMessageResponse;

        if (response.ok) {
          const whatsappMessageId = payload.messages?.[0]?.id;
          if (!whatsappMessageId) {
            throw new ConflictException(
              'WhatsApp Cloud API accepted the message but returned no id',
            );
          }

          return {
            whatsappMessageId,
            status: 'SENT',
          };
        }

        const graphMessage =
          payload.error?.message ?? 'WhatsApp Cloud API request failed';

        if (isRetryableHttpStatus(response.status) && attempt < attempts - 1) {
          this.logger.warn(
            `WhatsApp send retry ${attempt + 1}/${attempts} after HTTP ${response.status}`,
          );
          await sleep(retryDelayMs(attempt, retryBaseMs));
          continue;
        }

        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          throw new ConflictException(graphMessage);
        }

        throw new BadGatewayException(graphMessage);
      } catch (error) {
        lastError = error;

        if (
          error instanceof ConflictException ||
          error instanceof ForbiddenException ||
          error instanceof ServiceUnavailableException ||
          error instanceof BadGatewayException
        ) {
          if (error instanceof BadGatewayException && attempt < attempts - 1) {
            this.logger.warn(
              `WhatsApp send retry ${attempt + 1}/${attempts} after gateway error`,
            );
            await sleep(retryDelayMs(attempt, retryBaseMs));
            continue;
          }
          throw error;
        }

        if (attempt < attempts - 1) {
          this.logger.warn(
            `WhatsApp send retry ${attempt + 1}/${attempts} after network error`,
          );
          await sleep(retryDelayMs(attempt, retryBaseMs));
          continue;
        }
      }
    }

    this.logger.error(
      'WhatsApp Cloud API send failed after retries',
      lastError,
    );
    throw new BadGatewayException('WhatsApp Cloud API request failed');
  }

  private async parseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
}
