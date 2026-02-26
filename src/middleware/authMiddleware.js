const { verifyAccessToken } = require('../services/tokenService');

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function authenticateAccessToken(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      error: 'missing_token',
      message: 'Access token is required.'
    });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'token_expired',
        message: 'Access token has expired.'
      });
    }

    return res.status(401).json({
      error: 'invalid_token',
      message: 'Access token is invalid.'
    });
  }
}

module.exports = {
  authenticateAccessToken,
  extractBearerToken
};
