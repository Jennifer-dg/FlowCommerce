/**
 * Extracts a stable error code from a Better Auth APIError without depending
 * on the exact exported type (the base `APIError` type does not expose `code`).
 *
 * Better Auth construye el error con `APIError.from(status, { code, message })`,
 * que guarda el par en `error.body`. Algunos errores más antiguos o mocks lo
 * exponen directamente en `error.code`, así que se consultan las dos rutas.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }

  if (
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }

  if ('body' in error) {
    const body = (error as { body?: unknown }).body;
    if (
      body !== null &&
      typeof body === 'object' &&
      'code' in body &&
      typeof (body as { code?: unknown }).code === 'string'
    ) {
      return (body as { code: string }).code;
    }
  }

  return undefined;
}
