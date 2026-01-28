const express = require('express');
const router = express.Router();
const twoFactorService = require('../../platform-core/services/twoFactorService');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../../platform-core/config/logger');

router.post('/setup', authenticate, async (req, res) => {
  try {
    const secret = await twoFactorService.generateSecret(req.user.id, req.user.email);
    res.json({
      secret: secret.secret,
      qrCode: secret.qrCode,
      otpauthUrl: secret.otpauthUrl
    });
  } catch (error) {
    logger.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

router.post('/enable',
  authenticate,
  [body('token').isString().isLength({ min: 6, max: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await twoFactorService.enable2FA(req.user.id, req.body.token);
      res.json(result);
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post('/disable',
  authenticate,
  [body('token').isString().isLength({ min: 6, max: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await twoFactorService.disable2FA(req.user.id, req.body.token);
      res.json(result);
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post('/verify',
  authenticate,
  [body('token').isString().isLength({ min: 6, max: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await twoFactorService.verify2FA(req.user.id, req.body.token);
      res.json(result);
    } catch (error) {
      logger.error('Error verifying 2FA:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  }
);

router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await twoFactorService.get2FAStatus(req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('Error getting 2FA status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.post('/backup-codes', authenticate, async (req, res) => {
  try {
    const codes = await twoFactorService.getBackupCodes(req.user.id);
    res.json({ codes });
  } catch (error) {
    logger.error('Error generating backup codes:', error);
    res.status(500).json({ error: 'Failed to generate backup codes' });
  }
});

module.exports = router;
