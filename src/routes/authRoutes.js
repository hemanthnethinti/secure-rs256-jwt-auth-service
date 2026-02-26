const bcrypt = require('bcrypt');
const express = require('express');
const { query } = require('../db');
const {
  createAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate
} = require('../services/tokenService');
const { bcryptSaltRounds } = require('../config');
const { enforceLoginRateLimit, recordLoginFailure } = require('../middleware/loginRateLimiter');

const router = express.Router();

function isValidPassword(password) {
  return typeof password === 'string' && /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

function requiredString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!requiredString(username) || !requiredString(email) || !requiredString(password)) {
      return res.status(400).json({
        error: 'invalid_input',
        message: 'username, email, and password are required.'
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: 'weak_password',
        message: 'Password must be at least 8 characters and include one number and one special character.'
      });
    }

    const passwordHash = await bcrypt.hash(password, bcryptSaltRounds);

    const result = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
      [username.trim(), email.trim().toLowerCase(), passwordHash]
    );

    return res.status(201).json({
      id: result.rows[0].id,
      username: result.rows[0].username,
      message: 'User registered successfully'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'conflict',
        message: 'Username or email already exists.'
      });
    }

    return next(error);
  }
});

router.post('/login', enforceLoginRateLimit, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!requiredString(username) || !requiredString(password)) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid username or password.'
      });
    }

    const result = await query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user) {
      recordLoginFailure(req.ip);
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid username or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      recordLoginFailure(req.ip);
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid username or password.'
      });
    }

    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = getRefreshTokenExpiryDate();
    await query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [
      user.id,
      refreshToken,
      refreshExpiresAt
    ]);

    const accessToken = createAccessToken({ username: user.username, roles: ['user'] });

    return res.status(200).json({
      token_type: 'Bearer',
      access_token: accessToken.token,
      expires_in: accessToken.expiresIn,
      refresh_token: refreshToken
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body;

    if (!requiredString(refreshToken)) {
      return res.status(401).json({
        error: 'invalid_refresh_token',
        message: 'Refresh token is invalid, expired, or revoked.'
      });
    }

    const result = await query(
      `SELECT rt.id, rt.user_id, rt.expires_at, u.username
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1`,
      [refreshToken]
    );

    const tokenRecord = result.rows[0];

    if (!tokenRecord) {
      return res.status(401).json({
        error: 'invalid_refresh_token',
        message: 'Refresh token is invalid, expired, or revoked.'
      });
    }

    if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
      await query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.id]);
      return res.status(401).json({
        error: 'invalid_refresh_token',
        message: 'Refresh token is invalid, expired, or revoked.'
      });
    }

    const accessToken = createAccessToken({ username: tokenRecord.username, roles: ['user'] });

    return res.status(200).json({
      token_type: 'Bearer',
      access_token: accessToken.token,
      expires_in: accessToken.expiresIn
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refresh_token: refreshToken } = req.body;

    if (!requiredString(refreshToken)) {
      return res.status(204).send();
    }

    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
