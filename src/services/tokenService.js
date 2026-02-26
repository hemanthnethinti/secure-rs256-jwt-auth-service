const crypto = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const {
  jwtPrivateKeyPath,
  jwtPublicKeyPath,
  jwtIssuer,
  accessTokenTtlSeconds,
  refreshTokenTtlDays
} = require('../config');

const privateKey = fs.readFileSync(jwtPrivateKeyPath, 'utf8');
const publicKey = fs.readFileSync(jwtPublicKeyPath, 'utf8');

function createAccessToken({ username, roles }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: jwtIssuer,
    sub: username,
    iat: now,
    exp: now + accessTokenTtlSeconds,
    roles
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    noTimestamp: true,
    header: {
      typ: 'JWT'
    }
  });

  return {
    token,
    expiresIn: accessTokenTtlSeconds,
    claims: payload
  };
}

function verifyAccessToken(token) {
  return jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: jwtIssuer
  });
}

function decodeTokenWithoutVerification(token) {
  return jwt.decode(token, { complete: true });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function getRefreshTokenExpiryDate() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + refreshTokenTtlDays);
  return expiry;
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
  decodeTokenWithoutVerification,
  generateRefreshToken,
  getRefreshTokenExpiryDate
};
