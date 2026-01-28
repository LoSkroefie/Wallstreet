const express = require('express');
const router = express.Router();
const webhookService = require('../../platform-core/services/webhookService');
const { authenticate } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');
const logger = require('../../platform-core/config/logger');

router.post('/',
  authenticate,
  [
    body('url').isURL().withMessage('Valid URL required'),
    body('events').isArray().withMessage('Events array required'),
    body('secret').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const webhook = await webhookService.createWebhook({
        userId: req.user.id,
        ...req.body
      });
      res.status(201).json(webhook);
    } catch (error) {
      logger.error('Error creating webhook:', error);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  }
);

router.get('/', authenticate, async (req, res) => {
  try {
    const webhooks = await webhookService.getUserWebhooks(req.user.id);
    res.json(webhooks);
  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

router.put('/:id',
  authenticate,
  [
    param('id').isUUID(),
    body('url').optional().isURL(),
    body('events').optional().isArray(),
    body('active').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const webhook = await webhookService.updateWebhook(req.params.id, req.body);
      res.json(webhook);
    } catch (error) {
      logger.error('Error updating webhook:', error);
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  }
);

router.delete('/:id', authenticate, param('id').isUUID(), async (req, res) => {
  try {
    await webhookService.deleteWebhook(req.params.id);
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

router.post('/:id/trigger',
  authenticate,
  [
    param('id').isUUID(),
    body('event').isString(),
    body('data').isObject()
  ],
  async (req, res) => {
    try {
      await webhookService.triggerWebhook(req.params.id, req.body.event, req.body.data);
      res.json({ message: 'Webhook triggered successfully' });
    } catch (error) {
      logger.error('Error triggering webhook:', error);
      res.status(500).json({ error: 'Failed to trigger webhook' });
    }
  }
);

module.exports = router;
