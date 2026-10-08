import { getApiErrorCode } from './better-auth.error';

describe('getApiErrorCode', () => {
  it('reads the code when it sits on the error itself (mocks/legacy)', () => {
    expect(
      getApiErrorCode(Object.assign(new Error('x'), { code: 'INVALID_TOKEN' })),
    ).toBe('INVALID_TOKEN');
  });

  it('reads the code from the Better Auth APIError body shape', () => {
    const error = Object.assign(new Error('Invalid token'), {
      body: { message: 'Invalid token', code: 'INVALID_TOKEN' },
    });

    expect(getApiErrorCode(error)).toBe('INVALID_TOKEN');
  });

  it('returns undefined when there is no code', () => {
    expect(getApiErrorCode(new Error('boom'))).toBeUndefined();
    expect(getApiErrorCode(null)).toBeUndefined();
    expect(getApiErrorCode('boom')).toBeUndefined();
  });

  it('returns undefined when the code is not a string', () => {
    expect(getApiErrorCode({ code: 42 })).toBeUndefined();
    expect(getApiErrorCode({ body: { code: 42 } })).toBeUndefined();
  });
});
