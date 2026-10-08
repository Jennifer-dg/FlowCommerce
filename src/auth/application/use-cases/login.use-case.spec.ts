import { Test, TestingModule } from '@nestjs/testing';
import { InvalidCredentialsException } from '../../../common/exceptions/domain.exceptions';
import { SESSION_MANAGER } from '../ports/session-manager';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  let loginUseCase: LoginUseCase;
  const sessionManager = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        {
          provide: SESSION_MANAGER,
          useValue: sessionManager,
        },
      ],
    }).compile();

    loginUseCase = module.get(LoginUseCase);
    jest.clearAllMocks();
  });

  it('returns the user and a session token when credentials are valid', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    sessionManager.signIn.mockResolvedValue({
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        creadoEn: createdAt,
        actualizadoEn: createdAt,
      },
      token: 'token-123',
    });

    const result = await loginUseCase.execute({
      email: 'ADA@flowcommerce.local',
      password: 'SecurePassword123!',
    });

    expect(sessionManager.signIn).toHaveBeenCalledWith({
      email: 'ada@flowcommerce.local',
      password: 'SecurePassword123!',
      rememberMe: false,
    });
    expect(result.token).toBe('token-123');
    expect(result.user.email).toBe('ada@flowcommerce.local');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('forwards rememberMe=true to the session manager', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    sessionManager.signIn.mockResolvedValue({
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        creadoEn: createdAt,
        actualizadoEn: createdAt,
      },
      token: 'token-123',
    });

    await loginUseCase.execute({
      email: 'ada@flowcommerce.local',
      password: 'SecurePassword123!',
      rememberMe: true,
    });

    expect(sessionManager.signIn).toHaveBeenCalledWith({
      email: 'ada@flowcommerce.local',
      password: 'SecurePassword123!',
      rememberMe: true,
    });
  });

  it('throws invalid credentials when the password is wrong', async () => {
    sessionManager.signIn.mockRejectedValue(
      Object.assign(new Error('invalid'), {
        code: 'INVALID_EMAIL_OR_PASSWORD',
      }),
    );

    await expect(
      loginUseCase.execute({
        email: 'ada@flowcommerce.local',
        password: 'WrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('rethrows unknown errors', async () => {
    const original = new Error('boom');
    sessionManager.signIn.mockRejectedValue(original);

    await expect(
      loginUseCase.execute({
        email: 'ada@flowcommerce.local',
        password: 'SecurePassword123!',
      }),
    ).rejects.toBe(original);
  });
});
