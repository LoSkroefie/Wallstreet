const { query } = require('../config/database');
const logger = require('../config/logger');
const axios = require('axios');
const crypto = require('crypto');

class WebhookService {
  async createWebhook(userId, webhookData) {
    try {
      const { url, events, secret } = webhookData;

      const result = await query(
        `INSERT INTO webhooks (user_id, url, events, secret, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [userId, url, events, secret || this.generateSecret()]
      );

      logger.info('Webhook created', { webhookId: result.rows[0].id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating webhook:', error);
      throw error;
    }
  }

  async getWebhooksByUser(userId) {
    try {
      const result = await query(
        'SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching webhooks:', error);
      throw error;
    }
  }

  async getWebhookById(webhookId, userId) {
    try {
      const result = await query(
        'SELECT * FROM webhooks WHERE id = $1 AND user_id = $2',
        [webhookId, userId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching webhook:', error);
      throw error;
    }
  }

  async updateWebhook(webhookId, userId, updates) {
    try {
      const { url, events, is_active } = updates;
      const result = await query(
        `UPDATE webhooks 
         SET url = COALESCE($1, url),
             events = COALESCE($2, events),
             is_active = COALESCE($3, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND user_id = $5
         RETURNING *`,
        [url, events, is_active, webhookId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Webhook not found');
      }

      logger.info('Webhook updated', { webhookId, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating webhook:', error);
      throw error;
    }
  }

  async deleteWebhook(webhookId, userId) {
    try {
      const result = await query(
        'DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id',
        [webhookId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Webhook not found');
      }

      logger.info('Webhook deleted', { webhookId, userId });
      return { message: 'Webhook deleted successfully' };
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      throw error;
    }
  }

  async triggerWebhook(eventType, payload) {
    try {
      const result = await query(
        'SELECT * FROM webhooks WHERE $1 = ANY(events) AND is_active = true',
        [eventType]
      );

      const webhooks = result.rows;

      for (const webhook of webhooks) {
        await this.deliverWebhook(webhook, eventType, payload);
      }

      logger.info('Webhooks triggered', { eventType, count: webhooks.length });
    } catch (error) {
      logger.error('Error triggering webhooks:', error);
    }
  }

  async deliverWebhook(webhook, eventType, payload) {
    const maxRetries = 3;
    let attempts = 0;
    let delivered = false;
    let responseStatus = null;
    let responseBody = null;

    while (attempts < maxRetries && !delivered) {
      attempts++;

      try {
        const signature = this.generateSignature(payload, webhook.secret);
        
        const response = await axios.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
            'User-Agent': 'Wallstreet-Webhooks/1.0'
          },
          timeout: 10000
        });

        responseStatus = response.status;
        responseBody = JSON.stringify(response.data);
        delivered = response.status >= 200 && response.status < 300;

        logger.info('Webhook delivered', {
          webhookId: webhook.id,
          eventType,
          attempts,
          status: responseStatus
        });

        await query(
          'UPDATE webhooks SET last_triggered = CURRENT_TIMESTAMP WHERE id = $1',
          [webhook.id]
        );

      } catch (error) {
        responseStatus = error.response?.status || 0;
        responseBody = error.message;

        logger.warn('Webhook delivery failed', {
          webhookId: webhook.id,
          eventType,
          attempts,
          error: error.message
        });

        if (attempts < maxRetries) {
          await this.delay(Math.pow(2, attempts) * 1000);
        }
      }
    }

    await query(
      `INSERT INTO webhook_deliveries 
       (webhook_id, event_type, payload, response_status, response_body, attempts, delivered)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        webhook.id,
        eventType,
        JSON.stringify(payload),
        responseStatus,
        responseBody,
        attempts,
        delivered
      ]
    );

    if (!delivered) {
      await query(
        'UPDATE webhooks SET retry_count = retry_count + 1 WHERE id = $1',
        [webhook.id]
      );
    }

    return delivered;
  }

  async getDeliveryHistory(webhookId, userId) {
    try {
      const result = await query(
        `SELECT wd.* 
         FROM webhook_deliveries wd
         JOIN webhooks w ON wd.webhook_id = w.id
         WHERE wd.webhook_id = $1 AND w.user_id = $2
         ORDER BY wd.created_at DESC
         LIMIT 100`,
        [webhookId, userId]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching delivery history:', error);
      throw error;
    }
  }

  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new WebhookService();
