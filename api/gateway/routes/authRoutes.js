const express = require('express');
const router = express.Router();
const { authService } = require('../../services');
const { successResponse, errorResponse } = require('../../../platform-core/utils/response');
const {
  loginValidation,
  registerValidation,
  updateProfileValidation,
} = require('../../middleware/validator');
const { authenticateJWT, authorize } = require('../../middleware/auth');
const { authRateLimiter } = require('../../middleware/rateLimiter');
const logger = require('../../../platform-core/config/logger');

router.post('/register', authRateLimiter, registerValidation, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      phone,
    });

    logger.info(`New user registered: ${email}`);

    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    logger.error('Registration error:', error);
    return errorResponse(res, error.message, 400);
  }
});

router.post('/login', authRateLimiter, loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');

    const result = await authService.login(email, password, ipAddress, userAgent);

    return successResponse(res, result, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    return errorResponse(res, error.message, 401);
  }
});

router.get('/profile', authenticateJWT, async (req, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user.userId);

    return successResponse(res, profile, 'Profile retrieved successfully');
  } catch (error) {
    logger.error('Get profile error:', error);
    return errorResponse(res, error.message, 404);
  }
});

router.put('/profile', authenticateJWT, updateProfileValidation, async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;

    const updatedProfile = await authService.updateUserProfile(req.user.userId, {
      firstName,
      lastName,
      phone,
    });

    return successResponse(res, updatedProfile, 'Profile updated successfully');
  } catch (error) {
    logger.error('Update profile error:', error);
    return errorResponse(res, error.message, 400);
  }
});

router.post('/change-password', authenticateJWT, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      return errorResponse(res, 'New password must be at least 8 characters', 400);
    }

    const result = await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );

    return successResponse(res, result, 'Password changed successfully');
  } catch (error) {
    logger.error('Change password error:', error);
    return errorResponse(res, error.message, 400);
  }
});

router.post('/logout', authenticateJWT, (req, res) => {
  return successResponse(res, null, 'Logout successful');
});

module.exports = router;
