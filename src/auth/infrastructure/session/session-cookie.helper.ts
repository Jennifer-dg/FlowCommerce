import { makeSignature } from 'better-auth/crypto';

// Construye el valor de la cookie de sesión que espera Better Auth para un
// token dado: firma HMAC-SHA256 del token con el secreto compartido.
export async function buildSignedSessionToken(
  token: string,
  secret: string,
): Promise<string> {
  const signature = await makeSignature(token, secret);
  return `${token}.${signature}`;
}
