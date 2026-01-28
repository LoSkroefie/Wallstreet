const express = require('express');
const router = express.Router();
const analyticsService = require('../../platform-core/services/analyticsService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');
const logger = require('../../platform-core/config/logger');

router.post('/track',
  authenticate,
  [
    body('eventType').isString(),
    body('eventName').isString(),
    body('properties').optional().isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await analyticsService.trackEvent({
        userId: req.user.id,
        eventType: req.body.eventType,
        eventName: req.body.eventName,
        properties: req.body.properties,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      res.json({ message: 'Event tracked' });
    } catch (error) {
      logger.error('Error tracking event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  }
);

router.get('/user/stats',
  authenticate,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate || new Date();
      
      const stats = await analyticsService.getUserStats(req.user.id, startDate, endDate);
      res.json(stats);
    } catch (error) {
      logger.error('Error getting user stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }
);

router.get('/platform/stats',
  authenticate,
  requireAdmin,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate || new Date();
      
      const stats = await analyticsService.getPlatformStats(startDate, endDate);
      res.json(stats);
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      res.status(500).json({ error: 'Failed to get platform stats' });
    }
  }
);

router.get('/transactions',
  authenticate,
  [query('period').optional().isString()],
  async (req, res) => {
    try {
      const period = req.query.period || '30d';
      const analytics = await analyticsService.getTransactionAnalytics(req.user.id, period);
      res.json(analytics);
    } catch (error) {
      logger.error('Error getting transaction analytics:', error);
      res.status(500).json({ error: 'Failed to get transaction analytics' });
    }
  }
);

router.get('/endpoints',
  authenticate,
  requireAdmin,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const endpoints = await analyticsService.getPopularEndpoints(limit);
      res.json(endpoints);
    } catch (error) {
      logger.error('Error getting popular endpoints:', error);
      res.status(500).json({ error: 'Failed to get endpoints' });
    }
  }
);

router.get('/active-users',
  authenticate,
  requireAdmin,
  [query('period').optional().isIn(['24h', '7d', '30d'])],
  async (req, res) => {
    try {
      const period = req.query.period || '24h';
      const count = await analyticsService.getActiveUsers(period);
      res.json({ activeUsers: count, period });
    } catch (error) {
      logger.error('Error getting active users:', error);
      res.status(500).json({ error: 'Failed to get active users' });
    }
  }
);

router.post('/report',
  authenticate,
  requireAdmin,
  [
    body('reportType').isIn(['user_activity', 'platform_overview', 'transaction_summary', 'api_performance']),
    body('params').isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const report = await analyticsService.generateReport(req.body.reportType, req.body.params);
      res.json(report);
    } catch (error) {
      logger.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

module.exports = router;
