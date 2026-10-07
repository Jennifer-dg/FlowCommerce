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
import { LoginUseCase } from '../src/auth/application/use-cases/login.use-case';
import { SignUpUseCase } from '../src/auth/application/use-cases/sign-up.use-case';
import { SESSION_MANAGER } from '../src/auth/application/ports/session-manager';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const signUpUseCase = {
    execute: jest.fn(),
  };
  const loginUseCase = {
    execute: jest.fn(),
  };
  const sessionManager = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SignUpUseCase)
      .useValue(signUpUseCase)
      .overrideProvider(LoginUseCase)
      .useValue(loginUseCase)
      .overrideProvider(SESSION_MANAGER)
      .useValue(sessionManager)
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

  it('POST /api/v1/auth/sign-up validates request body', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up')
      .send({ name: 'Ada', email: 'invalid-email', password: 'short' })
      .expect(400);
  });

  it('POST /api/v1/auth/sign-up returns created user', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    signUpUseCase.execute.mockResolvedValue({
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        creadoEn: createdAt,
        actualizadoEn: createdAt,
      },
      token: 'signup-token',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/sign-up')
      .send({
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        password: 'SecurePassword123!',
      })
      .expect(201);

    expect((response.body as { user: { email: string } }).user.email).toBe(
      'ada@flowcommerce.local',
    );
    expect(
      (response.body as { user: Record<string, unknown> }).user,
    ).not.toHaveProperty('passwordHash');
  });

  it('POST /api/v1/auth/login returns authenticated user', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    loginUseCase.execute.mockResolvedValue({
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        creadoEn: createdAt,
        actualizadoEn: createdAt,
      },
      token: 'login-token',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'ada@flowcommerce.local',
        password: 'SecurePassword123!',
      })
      .expect(200);

    expect((response.body as { user: { email: string } }).user.email).toBe(
      'ada@flowcommerce.local',
    );
  });

  it('GET /api/v1/auth/session returns the current user', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    sessionManager.getSession.mockResolvedValue({
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        creadoEn: createdAt,
        actualizadoEn: createdAt,
      },
      session: {
        id: 'session-id',
        userId: 'user-id',
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Cookie', 'flowcommerce.session_token=abc.def')
      .expect(200);

    expect((response.body as { user: { email: string } }).user.email).toBe(
      'ada@flowcommerce.local',
    );
  });

  it('GET /api/v1/auth/session returns 401 without an active session', async () => {
    sessionManager.getSession.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/api/v1/auth/session')
      .set('Cookie', 'flowcommerce.session_token=abc.def')
      .expect(401);
  });

  it('POST /api/v1/auth/logout clears the session', async () => {
    sessionManager.signOut.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', 'flowcommerce.session_token=abc.def')
      .expect(200);

    expect(response.body).toEqual({ success: true });
    expect(sessionManager.signOut).toHaveBeenCalled();
  });
});
