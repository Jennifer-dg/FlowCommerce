import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '../../../common/exceptions/domain.exceptions';
import { SESSION_MANAGER } from '../ports/session-manager';
import { SignUpUseCase } from './sign-up.use-case';

describe('SignUpUseCase', () => {
  let signUpUseCase: SignUpUseCase;
  const sessionManager = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignUpUseCase,
        {
          provide: SESSION_MANAGER,
          useValue: sessionManager,
        },
      ],
    }).compile();

    signUpUseCase = module.get(SignUpUseCase);
    jest.clearAllMocks();
  });

  it('signs up and returns the user and a session token', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    sessionManager.signUp.mockResolvedValue({
      user: {
        id: 'user-id',
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        creadoEn: createdAt,
        actualizadoEn: createdAt,
      },
      token: 'token-123',
    });

    const result = await signUpUseCase.execute({
      name: 'Ada Lovelace',
      email: 'ADA@flowcommerce.local',
      password: 'SecurePassword123!',
    });

    expect(sessionManager.signUp).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@flowcommerce.local',
      password: 'SecurePassword123!',
    });
    expect(result.token).toBe('token-123');
    expect(result.user).toEqual({
      id: 'user-id',
      name: 'Ada Lovelace',
      email: 'ada@flowcommerce.local',
      creadoEn: createdAt,
      actualizadoEn: createdAt,
    });
  });

  it('maps a duplicate email error to a ConflictException', async () => {
    sessionManager.signUp.mockRejectedValue(
      Object.assign(new Error('already registered'), {
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      }),
    );

    await expect(
      signUpUseCase.execute({
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        password: 'SecurePassword123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unknown errors', async () => {
    const original = new Error('boom');
    sessionManager.signUp.mockRejectedValue(original);

    await expect(
      signUpUseCase.execute({
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
        password: 'SecurePassword123!',
      }),
    ).rejects.toBe(original);
  });
});
