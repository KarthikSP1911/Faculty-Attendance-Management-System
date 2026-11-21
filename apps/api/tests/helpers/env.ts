import 'dotenv/config';

// Safety guard: tests must never touch the main database.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error('TEST_DATABASE_URL is missing. Create a Neon "test" branch and set TEST_DATABASE_URL / TEST_DIRECT_URL.');
}
if (process.env.DATABASE_URL && process.env.DATABASE_URL === testUrl) {
  throw new Error('TEST_DATABASE_URL equals DATABASE_URL. Refusing to run tests against the main database.');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_URL = process.env.TEST_DIRECT_URL ?? testUrl;
process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret';
process.env.CLIENT_URL = 'http://localhost:3000';
