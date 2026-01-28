const { verifyToken, verifyApiKey } = require('../../platform-core/utils/jwt');
const { unauthorizedResponse, forbiddenResponse } = require('../../platform-core/utils/response');
const logger = require('../../platform-core/config/logger');

const authenticateJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return unauthorizedResponse(res, 'No authorization token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return unauthorizedResponse(res, 'Invalid authorization format');
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('JWT authentication error:', error);
    return unauthorizedResponse(res, error.message);
  }
};

const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return unauthorizedResponse(res, 'No API key provided');
    }

    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

    if (!validApiKeys.includes(apiKey)) {
      return unauthorizedResponse(res, 'Invalid API key');
    }

    req.apiKey = apiKey;
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    logger.warn('Optional auth failed, continuing without user:', error.message);
    next();
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return forbiddenResponse(res, 'Insufficient permissions');
    }

    next();
  };
};

const authenticate = authenticateJWT;

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return unauthorizedResponse(res, 'Authentication required');
  }
  
  if (req.user.role !== 'admin') {
    return forbiddenResponse(res, 'Admin access required');
  }
  
  next();
};

module.exports = {
  authenticateJWT,
  authenticateApiKey,
  optionalAuth,
  authorize,
  authenticate,
  requireAdmin,
};
