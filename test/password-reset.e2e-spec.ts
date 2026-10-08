import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { SESSION_MANAGER } from '../src/auth/application/ports/session-manager';
import { RESET_TOKEN_READER } from '../src/auth/application/ports/reset-token.reader';

// El harness e2e (setup-e2e.ts) stubbea Better Auth porque su build es ESM
// puro, así que este suite reemplaza SESSION_MANAGER y RESET_TOKEN_READER con
// un doble que replica el contrato que Better Auth garantiza en producción:
// token de un solo uso, expiración de 30 minutos y respuestas de correo
// indistinguibles exista o no el usuario.
describe('Password reset (e2e)', () => {
  let app: INestApplication<App>;

  const state = {
    usersByEmail: new Map<
      string,
      { id: string; name: string; email: string; password: string }
    >(),
    resetTokens: new Map<string, { userId: string; expiresAt: number }>(),
    sentEmails: [] as { to: string; token: string }[],
    failNextRequest: false,
  };

  const sessionManager = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
    requestPasswordReset: jest.fn(({ email }: { email: string }) => {
      if (state.failNextRequest) {
        state.failNextRequest = false;
        return Promise.reject(new Error('transport down'));
      }
      const user = state.usersByEmail.get(email);
      if (!user) {
        // Como Better Auth: respuesta genérica y sin envío si no existe.
        return Promise.resolve();
      }
      const token = `reset-token-${state.resetTokens.size + 1}`;
      state.resetTokens.set(token, {
        userId: user.id,
        expiresAt: Date.now() + 30 * 60 * 1000,
      });
      state.sentEmails.push({ to: user.email, token });
      return Promise.resolve();
    }),
    resetPassword: jest.fn(
      ({
        token,
        newPassword,
      }: {
        token: string;
        newPassword: string;
      }): Promise<void> => {
        const entry = state.resetTokens.get(token);
        if (!entry || entry.expiresAt < Date.now()) {
          return Promise.reject(
            Object.assign(new Error('Invalid token'), {
              body: { message: 'Invalid token', code: 'INVALID_TOKEN' },
            }),
          );
        }
        state.resetTokens.delete(token);
        for (const user of state.usersByEmail.values()) {
          if (user.id === entry.userId) {
            user.password = newPassword;
          }
        }
        return Promise.resolve();
      },
    ),
  };

  const resetTokenReader = {
    findActiveResetToken: jest.fn(
      (token: string): Promise<{ expiresAt: Date } | null> => {
        const entry = state.resetTokens.get(token);
        if (!entry || entry.expiresAt < Date.now()) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ expiresAt: new Date(entry.expiresAt) });
      },
    ),
  };

  beforeEach(async () => {
    state.usersByEmail.clear();
    state.resetTokens.clear();
    state.sentEmails.length = 0;
    state.failNextRequest = false;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SESSION_MANAGER)
      .useValue(sessionManager)
      .overrideProvider(RESET_TOKEN_READER)
      .useValue(resetTokenReader)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  const seedUser = (email = 'ada@flowcommerce.local') => {
    const user = {
      id: `user-${state.usersByEmail.size + 1}`,
      name: 'Ada Lovelace',
      email,
      password: 'OldPassword123!',
    };
    state.usersByEmail.set(email, user);
    return user;
  };

  describe('POST /api/v1/auth/forgot-password', () => {
    it('responds 200 and sends the reset link for an existing user', async () => {
      seedUser();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ada@flowcommerce.local' })
        .expect(200);

      expect(response.body).toMatchObject({ status: true });
      expect(state.sentEmails).toHaveLength(1);
      expect(state.sentEmails[0]?.token).toBeTruthy();
    });

    it('responds 200 with the same body for an unknown email (no enumeration)', async () => {
      seedUser();

      const known = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ada@flowcommerce.local' })
        .expect(200);

      const unknown = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@flowcommerce.local' })
        .expect(200);

      expect(unknown.body).toEqual(known.body);
      expect(state.sentEmails).toHaveLength(1);
    });

    it('responds 200 even when the mail transport fails', async () => {
      seedUser();
      state.failNextRequest = true;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ada@flowcommerce.local' })
        .expect(200);

      expect(response.body).toMatchObject({ status: true });
    });

    it('returns 400 for an invalid body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('GET /api/v1/auth/reset-password/validate', () => {
    it('returns 200 for a valid, unexpired token', async () => {
      seedUser();
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ada@flowcommerce.local' })
        .expect(200);
      const token = state.sentEmails[0]?.token;

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/reset-password/validate')
        .query({ token })
        .expect(200);

      expect(response.body).toEqual({ valid: true });
    });

    it('returns 400 for an unknown token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/reset-password/validate')
        .query({ token: 'nope' })
        .expect(400);
    });

    it('returns 400 when the token is missing', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/reset-password/validate')
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    const requestReset = async () => {
      const user = seedUser();
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);
      return { user, token: state.sentEmails[0]?.token };
    };

    it('resets the password with a valid token', async () => {
      const { token } = await requestReset();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'NewSecurePassword123!' })
        .expect(200);

      expect(response.body).toEqual({ status: true });
      expect(state.usersByEmail.get('ada@flowcommerce.local')?.password).toBe(
        'NewSecurePassword123!',
      );
    });

    it('rejects the same token a second time (single use)', async () => {
      const { token } = await requestReset();

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'NewSecurePassword123!' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'AnotherPassword123!' })
        .expect(400);
    });

    it('returns 400 for an invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: 'bogus', password: 'NewSecurePassword123!' })
        .expect(400);
    });

    it('returns 400 for a short password (DTO validation)', async () => {
      const { token } = await requestReset();

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'short' })
        .expect(400);
    });

    it('returns 400 when the token is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ password: 'NewSecurePassword123!' })
        .expect(400);
    });
  });
});
