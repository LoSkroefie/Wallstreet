const { query } = require('../config/database');
const logger = require('../config/logger');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorService {
  async generateSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `Wallstreet (${userEmail})`,
        length: 32
      });

      await query(
        'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
        [secret.base32, userId]
      );

      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      logger.info('2FA secret generated', { userId });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url
      };
    } catch (error) {
      logger.error('Error generating 2FA secret:', error);
      throw error;
    }
  }

  async enable2FA(userId, token) {
    try {
      const result = await query(
        'SELECT two_factor_secret FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0] || !result.rows[0].two_factor_secret) {
        throw new Error('2FA not set up. Generate secret first.');
      }

      const isValid = this.verifyToken(result.rows[0].two_factor_secret, token);

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      await query(
        'UPDATE users SET two_factor_enabled = true WHERE id = $1',
        [userId]
      );

      logger.info('2FA enabled', { userId });
      return { message: '2FA enabled successfully' };
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  async disable2FA(userId, token) {
    try {
      const result = await query(
        'SELECT two_factor_secret FROM users WHERE id = $1 AND two_factor_enabled = true',
        [userId]
      );

      if (!result.rows[0]) {
        throw new Error('2FA not enabled');
      }

      const isValid = this.verifyToken(result.rows[0].two_factor_secret, token);

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      await query(
        'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
        [userId]
      );

      logger.info('2FA disabled', { userId });
      return { message: '2FA disabled successfully' };
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  async verify2FA(userId, token) {
    try {
      const result = await query(
        'SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0] || !result.rows[0].two_factor_enabled) {
        return { valid: false, message: '2FA not enabled' };
      }

      const isValid = this.verifyToken(result.rows[0].two_factor_secret, token);

      logger.info('2FA verification attempt', { userId, valid: isValid });

      return { valid: isValid };
    } catch (error) {
      logger.error('Error verifying 2FA:', error);
      throw error;
    }
  }

  verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });
  }

  async get2FAStatus(userId) {
    try {
      const result = await query(
        'SELECT two_factor_enabled FROM users WHERE id = $1',
        [userId]
      );

      return {
        enabled: result.rows[0]?.two_factor_enabled || false
      };
    } catch (error) {
      logger.error('Error getting 2FA status:', error);
      throw error;
    }
  }

  async getBackupCodes(userId) {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(this.generateBackupCode());
    }

    await query(
      'UPDATE users SET backup_codes = $1 WHERE id = $2',
      [JSON.stringify(codes), userId]
    );

    logger.info('Backup codes generated', { userId, count: codes.length });
    return codes;
  }

  generateBackupCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = new TwoFactorService();
