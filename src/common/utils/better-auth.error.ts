/**
 * Extracts a stable error code from a Better Auth APIError without depending
 * on the exact exported type (the base `APIError` type does not expose `code`).
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return undefined;
}
