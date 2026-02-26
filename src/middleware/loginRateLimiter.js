const WINDOW_MS = 60 * 1000;
const MAX_FAILURES = 5;

const failedAttemptsByIp = new Map();

function getAttemptWindow(ip) {
  const existing = failedAttemptsByIp.get(ip) || [];
  const now = Date.now();
  const freshAttempts = existing.filter((timestamp) => now - timestamp < WINDOW_MS);
  failedAttemptsByIp.set(ip, freshAttempts);
  return freshAttempts;
}

function getRateLimitState(ip) {
  const failures = getAttemptWindow(ip);
  const remaining = Math.max(0, MAX_FAILURES - failures.length);
  let retryAfterSeconds = 0;

  if (failures.length >= MAX_FAILURES) {
    const oldestFailure = failures[0];
    retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (Date.now() - oldestFailure)) / 1000));
  }

  return {
    limit: MAX_FAILURES,
    failures,
    remaining,
    retryAfterSeconds
  };
}

function enforceLoginRateLimit(req, res, next) {
  const ip = req.ip;
  const state = getRateLimitState(ip);

  res.setHeader('X-RateLimit-Limit', String(state.limit));
  res.setHeader('X-RateLimit-Remaining', String(state.remaining));

  if (state.failures.length >= MAX_FAILURES) {
    res.setHeader('Retry-After', String(state.retryAfterSeconds));
    return res.status(429).json({
      error: 'too_many_requests',
      message: 'Too many failed login attempts. Please try again later.'
    });
  }

  return next();
}

function recordLoginFailure(ip) {
  const failures = getAttemptWindow(ip);
  failures.push(Date.now());
  failedAttemptsByIp.set(ip, failures);
}

module.exports = {
  enforceLoginRateLimit,
  recordLoginFailure
};
