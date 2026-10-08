import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '../../../common/exceptions/domain.exceptions';
import { SESSION_MANAGER } from '../ports/session-manager';
import { ResetPasswordUseCase } from './reset-password.use-case';

describe('ResetPasswordUseCase', () => {
  let useCase: ResetPasswordUseCase;
  const sessionManager = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResetPasswordUseCase,
        { provide: SESSION_MANAGER, useValue: sessionManager },
      ],
    }).compile();

    useCase = module.get(ResetPasswordUseCase);
    jest.clearAllMocks();
  });

  it('resets the password with the given token', async () => {
    sessionManager.resetPassword.mockResolvedValue(undefined);

    await useCase.execute({
      token: 'token-123',
      password: 'NewSecurePassword123!',
    });

    expect(sessionManager.resetPassword).toHaveBeenCalledWith({
      token: 'token-123',
      newPassword: 'NewSecurePassword123!',
    });
  });

  it.each(['INVALID_TOKEN', 'TOKEN_EXPIRED', 'USER_NOT_FOUND'])(
    'maps %s from the error body to a 400 bad request',
    async (code) => {
      sessionManager.resetPassword.mockRejectedValue(
        Object.assign(new Error('bad token'), { body: { code } }),
      );

      await expect(
        useCase.execute({
          token: 'expired',
          password: 'NewSecurePassword123!',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('maps INVALID_TOKEN when the code sits on the error itself', async () => {
    sessionManager.resetPassword.mockRejectedValue(
      Object.assign(new Error('bad token'), { code: 'INVALID_TOKEN' }),
    );

    await expect(
      useCase.execute({ token: 'used', password: 'NewSecurePassword123!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps password length errors to a 400 bad request', async () => {
    sessionManager.resetPassword.mockRejectedValue(
      Object.assign(new Error('short'), {
        body: { code: 'PASSWORD_TOO_SHORT' },
      }),
    );

    await expect(
      useCase.execute({ token: 'token-123', password: 'short' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rethrows unknown errors', async () => {
    const original = new Error('boom');
    sessionManager.resetPassword.mockRejectedValue(original);

    await expect(
      useCase.execute({
        token: 'token-123',
        password: 'NewSecurePassword123!',
      }),
    ).rejects.toBe(original);
  });
});
