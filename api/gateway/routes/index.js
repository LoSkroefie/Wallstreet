const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const accountRoutes = require('./accountRoutes');
const transactionRoutes = require('./transactionRoutes');
const webhookRoutes = require('../../routes/webhooks');
const paymentRoutes = require('../../routes/payments');
const twoFactorRoutes = require('../../routes/twoFactor');
const analyticsRoutes = require('../../routes/analytics');

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/payments', paymentRoutes);
router.use('/2fa', twoFactorRoutes);
router.use('/analytics', analyticsRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Wallstreet API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      accounts: '/api/v1/accounts',
      transactions: '/api/v1/transactions',
      webhooks: '/api/v1/webhooks',
      payments: '/api/v1/payments',
      twoFactor: '/api/v1/2fa',
      analytics: '/api/v1/analytics',
    },
  });
});

module.exports = router;
