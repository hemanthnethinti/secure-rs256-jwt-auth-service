# Secure RS256 JWT Authentication Service

I built this project as a secure, stateless authentication API using Node.js, Express, PostgreSQL, and Docker.

Main features included:

- JWT access tokens signed with RSA private key (RS256)
- Refresh token flow with database-backed revocation and rotation
- Password hashing with bcrypt (salt rounds: 10)
- Brute-force protection for login endpoint (5 failed attempts/min/IP)
- Docker Compose setup with health checks and DB bootstrap SQL

## Tech Stack

- Node.js 20 + Express
- PostgreSQL 13
- JSON Web Token (RS256)
- bcrypt
- Docker + Docker Compose

## Project Structure

```
.
├── db/
│   └── init.sql
├── src/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── app.js
│   ├── config.js
│   ├── db.js
│   └── server.js
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── generate-keys.sh
├── package.json
└── test-auth-flow.sh
```

## Setup

1. Copy environment template:

```bash
cp .env.example .env
```

2. Generate RSA keys:

```bash
chmod +x generate-keys.sh
./generate-keys.sh
```

3. Start everything:

```bash
docker compose up --build
```

When services are healthy, API is available at:

`http://localhost:8080`

## Environment Variables

See `.env.example` for all required variables.

Mandatory:

- API_PORT
- DATABASE_URL
- JWT_PRIVATE_KEY_PATH
- JWT_PUBLIC_KEY_PATH

Additional:

- JWT_ISSUER
- ACCESS_TOKEN_TTL_SECONDS
- REFRESH_TOKEN_TTL_DAYS
- BCRYPT_SALT_ROUNDS
- DB_USER
- DB_PASSWORD
- DB_NAME

## API Endpoints

### `POST /auth/register`

Creates a new user account.

Rules:

- Password must be at least 8 chars, with 1 number and 1 special character.
- Password is stored as bcrypt hash (cost 10).

Responses:

- `201` success
- `400` invalid input / weak password
- `409` username or email exists

### `POST /auth/login`

Authenticates user and returns access + refresh tokens.

Responses:

- `200` with bearer access token (900s) and refresh token
- `401` invalid credentials
- `429` too many failed attempts

Rate limit behavior:

- 5 failed attempts/minute per IP allowed
- 6th failed attempt gets blocked
- Headers included: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

### `POST /auth/refresh`

Exchanges a valid refresh token for a new access token and a rotated refresh token.

Responses:

- `200` new access token and new refresh token
- `401` invalid/expired/revoked refresh token

Refresh token lifetime: 7 days.

### `GET /api/profile`

Protected endpoint that returns user profile.

Header:

- `Authorization: Bearer <access_token>`

Responses:

- `200` user profile
- `401` missing, invalid, or expired token

### `GET /api/verify-token?token=<access_token>`

Public endpoint to validate/decode an access token.

Responses:

- `200` with `{ valid: true, claims: ... }` when valid
- `200` with `{ valid: false, reason: ... }` when invalid

### `POST /auth/logout`

Invalidates refresh token (logout).

Response:

- `204` no content

## Database Schema

Initialized automatically from `db/init.sql`.

Tables:

- `users`
  - `id SERIAL PRIMARY KEY`
  - `username VARCHAR(255) UNIQUE NOT NULL`
  - `email VARCHAR(255) UNIQUE NOT NULL`
  - `password_hash VARCHAR(255) NOT NULL`
  - `created_at TIMESTAMP DEFAULT NOW()`

- `refresh_tokens`
  - `id SERIAL PRIMARY KEY`
  - `user_id INTEGER NOT NULL REFERENCES users(id)`
  - `token VARCHAR(512) UNIQUE NOT NULL`
  - `expires_at TIMESTAMP NOT NULL`
  - `created_at TIMESTAMP DEFAULT NOW()`

## Test Script

Run full auth flow:

```bash
chmod +x test-auth-flow.sh
./test-auth-flow.sh
```

Script flow:

1. Register unique user
2. Login and capture tokens
3. Call protected profile
4. Refresh access token
5. Call profile with refreshed token
6. Logout (revoke refresh token)

## Security Notes

- Private keys are excluded from git via `.gitignore`
- JWT uses RS256, signed with private key and verified with public key
- Access token has short TTL (15 minutes)
- Refresh tokens are hashed before DB storage, rotated on refresh, and can be revoked
- Passwords are salted and hashed using bcrypt

## Quick Manual Verification

- Health: `GET /health`
- Register user, login, inspect JWT claims (`iss`, `sub`, `iat`, `exp`, `roles`)
- Confirm `exp - iat = 900`
- Verify token signature with `keys/public.pem`
- Check DB entries in `users` and `refresh_tokens`
