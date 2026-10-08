import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EMAIL_SENDER } from '../../application/ports/email-sender';
import type { EmailMessage } from '../../application/ports/email-sender';
import { ResetPasswordEmailService } from './reset-password-email.service';

describe('ResetPasswordEmailService', () => {
  let service: ResetPasswordEmailService;
  let sent: EmailMessage[];
  const emailSender = {
    send: jest.fn((message: EmailMessage) => {
      sent.push(message);
      return Promise.resolve();
    }),
  };
  const data = {
    user: { id: 'user-1', email: 'ada@flowcommerce.local', name: 'Ada' },
    url: 'http://internal/reset-password/token-abc?callbackURL=',
    token: 'token-abc',
  };

  beforeAll(() => {
    Logger.overrideLogger(true);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordEmailService,
        { provide: EMAIL_SENDER, useValue: emailSender },
      ],
    }).compile();

    service = module.get(ResetPasswordEmailService);
    sent = [];
    emailSender.send.mockClear();
    emailSender.send.mockImplementation((message: EmailMessage) => {
      sent.push(message);
      return Promise.resolve();
    });
    jest.useRealTimers();
  });

  it('sends the reset link built from APP_URL and the token', async () => {
    await service.send(data, 'https://app.flowcommerce.com');

    expect(emailSender.send).toHaveBeenCalledTimes(1);
    expect(sent[0]?.to).toBe('ada@flowcommerce.local');
    expect(sent[0]?.text).toContain(
      'https://app.flowcommerce.com/reset-password?token=token-abc',
    );
    expect(sent[0]?.subject).toContain('FlowCommerce');
  });

  it('suppresses a second email to the same user within 60 seconds', async () => {
    await service.send(data, 'http://localhost:3000');
    await service.send(
      { ...data, token: 'token-def' },
      'http://localhost:3000',
    );

    expect(emailSender.send).toHaveBeenCalledTimes(1);
  });

  it('sends again once 60 seconds have passed', async () => {
    jest.useFakeTimers();

    await service.send(data, 'http://localhost:3000');
    jest.advanceTimersByTime(60_001);
    await service.send(
      { ...data, token: 'token-def' },
      'http://localhost:3000',
    );

    expect(emailSender.send).toHaveBeenCalledTimes(2);
  });

  it('propagates transport failures without marking the email as sent', async () => {
    emailSender.send.mockRejectedValueOnce(new Error('resend down'));

    await expect(service.send(data, 'http://localhost:3000')).rejects.toThrow(
      'resend down',
    );

    // Como el envío falló, el siguiente intento no queda suprimido.
    await service.send(data, 'http://localhost:3000');
    expect(emailSender.send).toHaveBeenCalledTimes(2);
  });

  it('does not throttle different users', async () => {
    await service.send(data, 'http://localhost:3000');
    await service.send(
      { ...data, user: { ...data.user, id: 'user-2' } },
      'http://localhost:3000',
    );

    expect(emailSender.send).toHaveBeenCalledTimes(2);
  });
});
