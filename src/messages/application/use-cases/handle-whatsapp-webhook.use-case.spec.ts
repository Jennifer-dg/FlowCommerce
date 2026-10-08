import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MessageDirection } from '@flowcommerce/types';
import { ForbiddenException } from '../../../common/exceptions/domain.exceptions';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../../leads/domain/repositories/lead.repository';
import {
  MESSAGES_REPOSITORY,
  type MessagesRepository,
} from '../../domain/ports/messages.repository';
import { signWhatsAppPayload } from '../../infrastructure/whatsapp/whatsapp-webhook.signature';
import { HandleWhatsAppWebhookUseCase } from './handle-whatsapp-webhook.use-case';

describe('HandleWhatsAppWebhookUseCase', () => {
  let module: TestingModule;
  const projectId = '33333333-3333-4333-8333-333333333333';
  const appSecret = 'webhook-secret';
  const config: Record<string, string> = {
    WHATSAPP_APP_SECRET: appSecret,
    WHATSAPP_VERIFY_TOKEN: 'verify-me',
    WHATSAPP_PHONE_NUMBER_ID: '123456789',
    WHATSAPP_PROJECT_ID: projectId,
  };

  const leadRepository: Record<keyof LeadRepository, jest.Mock> = {
    findByIdInProject: jest.fn(),
    findByPhoneDigitsInProject: jest.fn(),
    listByProject: jest.fn(),
    create: jest.fn(),
    updateInProject: jest.fn(),
    linkClientInProject: jest.fn(),
    deleteInProject: jest.fn(),
  };
  const messagesRepository: Record<keyof MessagesRepository, jest.Mock> = {
    create: jest.fn(),
    createIfNotExists: jest.fn(),
    findByWhatsappMessageIdInProject: jest.fn(),
    updateStatusInProject: jest.fn(),
    findByLeadId: jest.fn(),
  };

  const inboundPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: '123456789' },
              messages: [
                {
                  from: '525512345678',
                  id: 'wamid.in-1',
                  type: 'text',
                  text: { body: 'Quiero la cotización' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        HandleWhatsAppWebhookUseCase,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
        { provide: LEADS_REPOSITORY, useValue: leadRepository },
        { provide: MESSAGES_REPOSITORY, useValue: messagesRepository },
      ],
    }).compile();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the hub challenge when the verify token matches', () => {
    expect(
      module
        .get(HandleWhatsAppWebhookUseCase)
        .verifyChallenge('subscribe', 'verify-me', 'challenge-123'),
    ).toBe('challenge-123');
  });

  it('rejects a verify request with the wrong token', () => {
    expect(() =>
      module
        .get(HandleWhatsAppWebhookUseCase)
        .verifyChallenge('subscribe', 'nope', 'challenge-123'),
    ).toThrow(ForbiddenException);
  });

  it('persists an inbound text message for the lead in the bound project', async () => {
    const rawBody = Buffer.from(JSON.stringify(inboundPayload));
    leadRepository.findByPhoneDigitsInProject.mockResolvedValue({
      id: '77777777-7777-4777-8777-777777777777',
    });
    messagesRepository.createIfNotExists.mockResolvedValue({});

    await module.get(HandleWhatsAppWebhookUseCase).execute({
      rawBody,
      signatureHeader: signWhatsAppPayload(rawBody, appSecret),
      payload: inboundPayload,
    });

    expect(leadRepository.findByPhoneDigitsInProject).toHaveBeenCalledWith(
      '525512345678',
      projectId,
    );
    expect(messagesRepository.createIfNotExists).toHaveBeenCalledWith({
      projectId,
      leadId: '77777777-7777-4777-8777-777777777777',
      whatsappMessageId: 'wamid.in-1',
      direction: MessageDirection.INBOUND,
      content: 'Quiero la cotización',
      status: 'RECEIVED',
    });
  });

  it('rejects unsigned payloads', async () => {
    const rawBody = Buffer.from(JSON.stringify(inboundPayload));

    await expect(
      module.get(HandleWhatsAppWebhookUseCase).execute({
        rawBody,
        signatureHeader: 'sha256=deadbeef',
        payload: inboundPayload,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messagesRepository.createIfNotExists).not.toHaveBeenCalled();
  });

  it('does not persist events for another phone_number_id', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: '000000' },
                messages: inboundPayload.entry[0].changes[0].value.messages,
              },
            },
          ],
        },
      ],
    };
    const rawBody = Buffer.from(JSON.stringify(payload));

    await module.get(HandleWhatsAppWebhookUseCase).execute({
      rawBody,
      signatureHeader: signWhatsAppPayload(rawBody, appSecret),
      payload,
    });

    expect(leadRepository.findByPhoneDigitsInProject).not.toHaveBeenCalled();
    expect(messagesRepository.createIfNotExists).not.toHaveBeenCalled();
  });

  it('does not persist events that carry no phone_number_id (fail-closed)', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                messages: inboundPayload.entry[0].changes[0].value.messages,
                statuses: [{ id: 'wamid.out-1', status: 'read' }],
              },
            },
          ],
        },
      ],
    };
    const rawBody = Buffer.from(JSON.stringify(payload));

    await module.get(HandleWhatsAppWebhookUseCase).execute({
      rawBody,
      signatureHeader: signWhatsAppPayload(rawBody, appSecret),
      payload,
    });

    expect(leadRepository.findByPhoneDigitsInProject).not.toHaveBeenCalled();
    expect(messagesRepository.createIfNotExists).not.toHaveBeenCalled();
    expect(messagesRepository.updateStatusInProject).not.toHaveBeenCalled();
  });

  it('persists nothing when WHATSAPP_PHONE_NUMBER_ID is not configured', async () => {
    const saved = config.WHATSAPP_PHONE_NUMBER_ID;
    delete config.WHATSAPP_PHONE_NUMBER_ID;
    try {
      const rawBody = Buffer.from(JSON.stringify(inboundPayload));

      await module.get(HandleWhatsAppWebhookUseCase).execute({
        rawBody,
        signatureHeader: signWhatsAppPayload(rawBody, appSecret),
        payload: inboundPayload,
      });
    } finally {
      config.WHATSAPP_PHONE_NUMBER_ID = saved;
    }

    expect(leadRepository.findByPhoneDigitsInProject).not.toHaveBeenCalled();
    expect(messagesRepository.createIfNotExists).not.toHaveBeenCalled();
  });

  it('updates delivery status only inside the bound project', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: '123456789' },
                statuses: [{ id: 'wamid.out-1', status: 'delivered' }],
              },
            },
          ],
        },
      ],
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    messagesRepository.updateStatusInProject.mockResolvedValue({});

    await module.get(HandleWhatsAppWebhookUseCase).execute({
      rawBody,
      signatureHeader: signWhatsAppPayload(rawBody, appSecret),
      payload,
    });

    expect(messagesRepository.updateStatusInProject).toHaveBeenCalledWith(
      'wamid.out-1',
      projectId,
      'DELIVERED',
    );
  });
});
