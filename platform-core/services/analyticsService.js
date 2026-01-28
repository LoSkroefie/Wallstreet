const { query } = require('../config/database');
const logger = require('../config/logger');
const redisClient = require('../config/redis');

class AnalyticsService {
  async trackEvent(eventData) {
    try {
      const { userId, eventType, eventName, properties, ipAddress, userAgent } = eventData;

      await query(
        `INSERT INTO analytics_events 
         (user_id, event_type, event_name, properties, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, eventType, eventName, JSON.stringify(properties || {}), ipAddress, userAgent]
      );

      await this.incrementMetric(`event:${eventType}`, 1);
      await this.incrementMetric(`user:${userId}:events`, 1);

      logger.info('Analytics event tracked', { userId, eventType, eventName });
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
    }
  }

  async getUserStats(userId, startDate, endDate) {
    try {
      const result = await query(
        `SELECT 
           COUNT(*) as total_events,
           COUNT(DISTINCT DATE(created_at)) as active_days,
           jsonb_object_agg(event_type, event_count) as events_by_type
         FROM (
           SELECT event_type, COUNT(*) as event_count, created_at
           FROM analytics_events
           WHERE user_id = $1 
             AND created_at BETWEEN $2 AND $3
           GROUP BY event_type, created_at
         ) subquery`,
        [userId, startDate, endDate]
      );

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getPlatformStats(startDate, endDate) {
    try {
      const [users, transactions, accounts, events] = await Promise.all([
        query(
          'SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new FROM users',
          [startDate]
        ),
        query(
          'SELECT COUNT(*) as total, SUM(amount) as volume FROM transactions WHERE created_at BETWEEN $1 AND $2',
          [startDate, endDate]
        ),
        query(
          'SELECT COUNT(*) as total, SUM(balance) as total_balance FROM accounts WHERE status = $1',
          ['active']
        ),
        query(
          'SELECT COUNT(*) as total FROM analytics_events WHERE created_at BETWEEN $1 AND $2',
          [startDate, endDate]
        )
      ]);

      return {
        users: {
          total: parseInt(users.rows[0].total),
          new: parseInt(users.rows[0].new)
        },
        transactions: {
          total: parseInt(transactions.rows[0].total || 0),
          volume: parseFloat(transactions.rows[0].volume || 0)
        },
        accounts: {
          total: parseInt(accounts.rows[0].total),
          totalBalance: parseFloat(accounts.rows[0].total_balance || 0)
        },
        events: {
          total: parseInt(events.rows[0].total)
        }
      };
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      throw error;
    }
  }

  async getTransactionAnalytics(userId, period = '30d') {
    try {
      const days = parseInt(period) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await query(
        `SELECT 
           DATE(created_at) as date,
           transaction_type,
           COUNT(*) as count,
           SUM(amount) as total_amount,
           AVG(amount) as avg_amount
         FROM transactions
         WHERE account_id IN (SELECT id FROM accounts WHERE user_id = $1)
           AND created_at >= $2
         GROUP BY DATE(created_at), transaction_type
         ORDER BY date DESC`,
        [userId, startDate]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting transaction analytics:', error);
      throw error;
    }
  }

  async getPopularEndpoints(limit = 10) {
    try {
      const result = await query(
        `SELECT 
           event_name as endpoint,
           COUNT(*) as requests,
           AVG((properties->>'response_time')::integer) as avg_response_time
         FROM analytics_events
         WHERE event_type = 'api_request'
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY event_name
         ORDER BY requests DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting popular endpoints:', error);
      throw error;
    }
  }

  async getActiveUsers(period = '24h') {
    try {
      const interval = period === '24h' ? '24 hours' : period === '7d' ? '7 days' : '30 days';

      const result = await query(
        `SELECT COUNT(DISTINCT user_id) as active_users
         FROM analytics_events
         WHERE created_at >= NOW() - INTERVAL '${interval}'`
      );

      return parseInt(result.rows[0].active_users);
    } catch (error) {
      logger.error('Error getting active users:', error);
      throw error;
    }
  }

  async incrementMetric(key, value = 1) {
    try {
      await redisClient.incrby(key, value);
      await redisClient.expire(key, 86400);
    } catch (error) {
      logger.error('Error incrementing metric:', error);
    }
  }

  async getMetric(key) {
    try {
      const value = await redisClient.get(key);
      return parseInt(value) || 0;
    } catch (error) {
      logger.error('Error getting metric:', error);
      return 0;
    }
  }

  async generateReport(reportType, params) {
    try {
      let data = {};

      switch (reportType) {
        case 'user_activity':
          data = await this.getUserStats(params.userId, params.startDate, params.endDate);
          break;
        case 'platform_overview':
          data = await this.getPlatformStats(params.startDate, params.endDate);
          break;
        case 'transaction_summary':
          data = await this.getTransactionAnalytics(params.userId, params.period);
          break;
        case 'api_performance':
          data = await this.getPopularEndpoints(params.limit || 10);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      logger.info('Report generated', { reportType, params });
      return {
        reportType,
        generatedAt: new Date().toISOString(),
        data
      };
    } catch (error) {
      logger.error('Error generating report:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
