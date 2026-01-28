const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-change-this';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

const generateToken = (payload, expiresIn = JWT_EXPIRATION) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRATION });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

const generateApiKey = () => {
  const apiKey = crypto.randomBytes(32).toString('hex');
  return apiKey;
};

const hashApiKey = (apiKey) => {
  const salt = process.env.API_KEY_SALT || 'default-salt';
  return crypto.createHmac('sha256', salt).update(apiKey).digest('hex');
};

const verifyApiKey = (apiKey, hashedKey) => {
  const hash = hashApiKey(apiKey);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedKey));
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generateApiKey,
  hashApiKey,
  verifyApiKey,
};
