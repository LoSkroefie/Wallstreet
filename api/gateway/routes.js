const express = require('express');
const router = express.Router();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const webhookRoutes = require('../../routes/webhooks');
const paymentRoutes = require('../../routes/payments');
const twoFactorRoutes = require('../../routes/twoFactor');
const analyticsRoutes = require('../../routes/analytics');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/payments', paymentRoutes);
router.use('/2fa', twoFactorRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
