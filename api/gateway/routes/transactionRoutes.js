const express = require('express');
const router = express.Router();
const { transactionService } = require('../../services');
const {
  successResponse,
  errorResponse,
  paginatedResponse,
} = require('../../../platform-core/utils/response');
const { authenticateJWT } = require('../../middleware/auth');
const { transactionValidation, idParamValidation, paginationValidation } = require('../../middleware/validator');
const logger = require('../../../platform-core/config/logger');

router.post('/', authenticateJWT, transactionValidation, async (req, res, next) => {
  try {
    const { accountId, amount, transactionType, currency, description, metadata } = req.body;

    const transaction = await transactionService.createTransaction(req.user.userId, {
      accountId,
      amount,
      transactionType,
      currency,
      description,
      metadata,
    });

    logger.info(`Transaction created: ${transaction.id} by user: ${req.user.userId}`);

    return successResponse(res, transaction, 'Transaction created successfully', 201);
  } catch (error) {
    logger.error('Create transaction error:', error);
    return errorResponse(res, error.message, 400);
  }
});

router.get('/:id', authenticateJWT, idParamValidation, async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(
      req.params.id,
      req.user.userId
    );

    return successResponse(res, transaction, 'Transaction retrieved successfully');
  } catch (error) {
    logger.error('Get transaction error:', error);
    return errorResponse(res, error.message, 404);
  }
});

router.post('/:id/process', authenticateJWT, idParamValidation, async (req, res, next) => {
  try {
    const result = await transactionService.processTransaction(req.params.id);

    logger.info(`Transaction processed: ${req.params.id}`);

    return successResponse(res, result, 'Transaction processed successfully');
  } catch (error) {
    logger.error('Process transaction error:', error);
    return errorResponse(res, error.message, 400);
  }
});

router.get('/account/:accountId', authenticateJWT, paginationValidation, async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { page = 1, limit = 20, status, type } = req.query;

    const result = await transactionService.getAccountTransactions(
      accountId,
      req.user.userId,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        type,
      }
    );

    return paginatedResponse(
      res,
      result.transactions,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total,
      'Transactions retrieved successfully'
    );
  } catch (error) {
    logger.error('Get account transactions error:', error);
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;
