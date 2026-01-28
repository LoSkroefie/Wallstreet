const express = require('express');
const router = express.Router();
const { accountService } = require('../../services');
const { successResponse, errorResponse } = require('../../../platform-core/utils/response');
const { authenticateJWT } = require('../../middleware/auth');
const { idParamValidation } = require('../../middleware/validator');
const logger = require('../../../platform-core/config/logger');

router.post('/', authenticateJWT, async (req, res, next) => {
  try {
    const { accountType, currency } = req.body;

    if (!accountType) {
      return errorResponse(res, 'Account type is required', 400);
    }

    const account = await accountService.createAccount(req.user.userId, {
      accountType,
      currency,
    });

    logger.info(`Account created: ${account.id} by user: ${req.user.userId}`);

    return successResponse(res, account, 'Account created successfully', 201);
  } catch (error) {
    logger.error('Create account error:', error);
    return errorResponse(res, error.message, 400);
  }
});

router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const accounts = await accountService.getUserAccounts(req.user.userId);

    return successResponse(res, accounts, 'Accounts retrieved successfully');
  } catch (error) {
    logger.error('Get accounts error:', error);
    return errorResponse(res, error.message, 500);
  }
});

router.get('/:id', authenticateJWT, idParamValidation, async (req, res, next) => {
  try {
    const account = await accountService.getAccountById(req.params.id, req.user.userId);

    return successResponse(res, account, 'Account retrieved successfully');
  } catch (error) {
    logger.error('Get account error:', error);
    return errorResponse(res, error.message, 404);
  }
});

router.get('/:id/balance', authenticateJWT, idParamValidation, async (req, res, next) => {
  try {
    const balance = await accountService.getAccountBalance(req.params.id, req.user.userId);

    return successResponse(res, balance, 'Balance retrieved successfully');
  } catch (error) {
    logger.error('Get balance error:', error);
    return errorResponse(res, error.message, 404);
  }
});

router.delete('/:id', authenticateJWT, idParamValidation, async (req, res, next) => {
  try {
    const result = await accountService.closeAccount(req.params.id, req.user.userId);

    logger.info(`Account closed: ${req.params.id} by user: ${req.user.userId}`);

    return successResponse(res, result, 'Account closed successfully');
  } catch (error) {
    logger.error('Close account error:', error);
    return errorResponse(res, error.message, 400);
  }
});

module.exports = router;
