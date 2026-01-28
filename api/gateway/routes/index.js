const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const accountRoutes = require('./accountRoutes');
const transactionRoutes = require('./transactionRoutes');

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Wallstreet API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      accounts: '/api/v1/accounts',
      transactions: '/api/v1/transactions',
    },
  });
});

module.exports = router;
