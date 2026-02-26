const express = require('express');
const { query } = require('../db');
const { authenticateAccessToken } = require('../middleware/authMiddleware');
const { verifyAccessToken } = require('../services/tokenService');

const router = express.Router();

router.get('/profile', authenticateAccessToken, async (req, res, next) => {
  try {
    const username = req.auth.sub;
    const result = await query('SELECT id, username, email FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Access token is invalid.'
      });
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      roles: Array.isArray(req.auth.roles) ? req.auth.roles : ['user']
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/verify-token', (req, res) => {
  const token = req.query.token;

  if (!token || typeof token !== 'string') {
    return res.status(200).json({
      valid: false,
      reason: 'Token is missing.'
    });
  }

  try {
    const claims = verifyAccessToken(token);
    return res.status(200).json({
      valid: true,
      claims: {
        iss: claims.iss,
        sub: claims.sub,
        exp: claims.exp,
        roles: claims.roles
      }
    });
  } catch (error) {
    return res.status(200).json({
      valid: false,
      reason: error.name === 'TokenExpiredError' ? 'Token has expired' : 'Token is invalid'
    });
  }
});

module.exports = router;
