const path = require('path');

const requiredVariables = [
  'API_PORT',
  'DATABASE_URL',
  'JWT_PRIVATE_KEY_PATH',
  'JWT_PUBLIC_KEY_PATH',
  'JWT_ISSUER'
];

function ensureRequiredEnvironmentVariables() {
  const missing = requiredVariables.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function resolveKeyPath(keyPath) {
  if (path.isAbsolute(keyPath)) {
    return keyPath;
  }

  return path.resolve(process.cwd(), keyPath);
}

module.exports = {
  ensureRequiredEnvironmentVariables,
  apiPort: Number(process.env.API_PORT || 8080),
  databaseUrl: process.env.DATABASE_URL,
  jwtPrivateKeyPath: resolveKeyPath(process.env.JWT_PRIVATE_KEY_PATH || 'keys/private.pem'),
  jwtPublicKeyPath: resolveKeyPath(process.env.JWT_PUBLIC_KEY_PATH || 'keys/public.pem'),
  jwtIssuer: process.env.JWT_ISSUER || 'secure-rs256-jwt-auth-service',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10)
};