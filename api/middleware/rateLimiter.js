const rateLimit = require('express-rate-limit');
const { redisClient } = require('../../platform-core/config/redis');
const RedisStore = require('rate-limit-redis');
const logger = require('../../platform-core/config/logger');

const createRateLimiter = (options = {}) => {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message = 'Too many requests, please try again later',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  const limiterConfig = {
    windowMs,
    max,
    message: {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    },
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
      });
    },
  };

  if (process.env.REDIS_URL) {
    limiterConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    });
  }

  return rateLimit(limiterConfig);
};

const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'API rate limit exceeded',
});

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true,
});

const createCustomRateLimiter = (windowMs, max, message) => {
  return createRateLimiter({ windowMs, max, message });
};

module.exports = {
  createRateLimiter,
  strictRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  createCustomRateLimiter,
};
