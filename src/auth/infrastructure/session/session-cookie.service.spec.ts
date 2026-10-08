import type { ConfigService } from '@nestjs/config';
import { SessionCookieService } from './session-cookie.service';
import { REMEMBERED_SESSION_SECONDS } from './session-lifetime';

jest.mock('./session-cookie.helper', () => ({
  buildSignedSessionToken: jest.fn((token: string) =>
    Promise.resolve(`${token}.signature`),
  ),
}));

describe('SessionCookieService', () => {
  const config = {
    getOrThrow: jest.fn(() => 'secret'),
    get: jest.fn(() => undefined),
  } as unknown as ConfigService;

  const service = new SessionCookieService(config);

  it('builds a browser-session cookie by default (no Max-Age)', async () => {
    const cookie = await service.build('token-1');

    expect(cookie.value).toBe('token-1.signature');
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.maxAge).toBeUndefined();
  });

  it('builds a persistent cookie when rememberMe is set', async () => {
    const cookie = await service.build('token-1', { persistent: true });

    expect(cookie.maxAge).toBe(REMEMBERED_SESSION_SECONDS * 1000);
  });
});
