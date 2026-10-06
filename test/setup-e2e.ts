process.env.DATABASE_URL ??=
  'postgresql://flowcommerce:flowcommerce@localhost:5432/flowcommerce_dev';
process.env.NODE_ENV ??= 'test';
process.env.WHATSAPP_TOKEN ??= 'e2e-whatsapp-token';
process.env.WHATSAPP_PHONE_NUMBER_ID ??= 'e2e-phone-id';
process.env.WHATSAPP_APP_SECRET ??= 'e2e-whatsapp-app-secret';
process.env.WHATSAPP_VERIFY_TOKEN ??= 'e2e-whatsapp-verify-token';

// Better Auth ships pure-ESM builds that this Jest setup (CommonJS/ts-jest)
// cannot load directly. The e2e suites do not exercise Better Auth (the
// session manager and auth use-cases are overridden with mocks), so we stub
// the ESM entry points here to keep the app booting under Jest.
jest.mock('better-auth', () => {
  const api = {
    signUpEmail: jest.fn(),
    signInEmail: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  };
  return {
    betterAuth: jest.fn(() => ({ api })),
    APIError: class extends Error {},
  };
});

jest.mock('better-auth/crypto', () => ({
  makeSignature: jest.fn(() => Promise.resolve('mock-signature')),
}));

jest.mock('@better-auth/drizzle-adapter', () => ({
  drizzleAdapter: jest.fn(() => ({})),
}));
