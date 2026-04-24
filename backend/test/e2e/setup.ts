// Populate env vars required by ConfigModule's Joi validation schema before
// the NestJS app is bootstrapped in tests. The database values are irrelevant
// since the DataSource is overridden with pg-mem in the test module, but the
// schema requires them to be present.
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DATABASE = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';