import { Test, TestingModule } from '@nestjs/testing';
import { RESET_TOKEN_READER } from '../ports/reset-token.reader';
import { ValidateResetTokenUseCase } from './validate-reset-token.use-case';

describe('ValidateResetTokenUseCase', () => {
  let useCase: ValidateResetTokenUseCase;
  const resetTokenReader = {
    findActiveResetToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateResetTokenUseCase,
        { provide: RESET_TOKEN_READER, useValue: resetTokenReader },
      ],
    }).compile();

    useCase = module.get(ValidateResetTokenUseCase);
    jest.clearAllMocks();
  });

  it('returns true when the token exists and has not expired', async () => {
    resetTokenReader.findActiveResetToken.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(useCase.execute({ token: 'valid-token' })).resolves.toBe(true);
    expect(resetTokenReader.findActiveResetToken).toHaveBeenCalledWith(
      'valid-token',
    );
  });

  it('returns false when the token is unknown or expired', async () => {
    resetTokenReader.findActiveResetToken.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'expired-token' })).resolves.toBe(
      false,
    );
  });
});
