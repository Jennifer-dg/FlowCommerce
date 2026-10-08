import { Test, TestingModule } from '@nestjs/testing';
import { SESSION_MANAGER } from '../ports/session-manager';
import { ForgotPasswordUseCase } from './forgot-password.use-case';

describe('ForgotPasswordUseCase', () => {
  let useCase: ForgotPasswordUseCase;
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
        ForgotPasswordUseCase,
        { provide: SESSION_MANAGER, useValue: sessionManager },
      ],
    }).compile();

    useCase = module.get(ForgotPasswordUseCase);
    jest.clearAllMocks();
  });

  it('requests the reset link with the normalized email', async () => {
    sessionManager.requestPasswordReset.mockResolvedValue(undefined);

    await useCase.execute({ email: '  ADA@Flowcommerce.LOCAL ' });

    expect(sessionManager.requestPasswordReset).toHaveBeenCalledWith({
      email: 'ada@flowcommerce.local',
    });
  });

  it('resolves even when the session manager fails (never surfaces errors)', async () => {
    sessionManager.requestPasswordReset.mockRejectedValue(
      new Error('resend down'),
    );

    await expect(
      useCase.execute({ email: 'ada@flowcommerce.local' }),
    ).resolves.toBeUndefined();
    expect(sessionManager.requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the email does not exist', async () => {
    sessionManager.requestPasswordReset.mockResolvedValue(undefined);

    await expect(
      useCase.execute({ email: 'nobody@flowcommerce.local' }),
    ).resolves.toBeUndefined();
  });
});
