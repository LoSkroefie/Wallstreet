const express = require('express');
const router = express.Router();
const stripeIntegration = require('../../platform-core/integrations/stripeIntegration');
const paypalIntegration = require('../../platform-core/integrations/paypalIntegration');
const { authenticate } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../../platform-core/config/logger');

router.post('/stripe/customer', authenticate, async (req, res) => {
  try {
    const customer = await stripeIntegration.createCustomer({
      email: req.user.email,
      name: req.user.name,
      metadata: { userId: req.user.id }
    });
    res.status(201).json(customer);
  } catch (error) {
    logger.error('Error creating Stripe customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.post('/stripe/payment-intent',
  authenticate,
  [
    body('amount').isInt({ min: 1 }),
    body('currency').isString().isLength({ min: 3, max: 3 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const paymentIntent = await stripeIntegration.createPaymentIntent({
        amount: req.body.amount,
        currency: req.body.currency,
        customer: req.body.customerId,
        metadata: { userId: req.user.id }
      });
      res.status(201).json(paymentIntent);
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  }
);

router.post('/stripe/refund',
  authenticate,
  [body('paymentIntentId').isString()],
  async (req, res) => {
    try {
      const refund = await stripeIntegration.refundPayment(req.body.paymentIntentId);
      res.json(refund);
    } catch (error) {
      logger.error('Error processing refund:', error);
      res.status(500).json({ error: 'Failed to process refund' });
    }
  }
);

router.post('/paypal/order',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }),
    body('currency').isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const order = await paypalIntegration.createOrder(
        req.body.amount,
        req.body.currency,
        { userId: req.user.id }
      );
      res.status(201).json(order);
    } catch (error) {
      logger.error('Error creating PayPal order:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }
);

router.post('/paypal/order/:orderId/capture',
  authenticate,
  async (req, res) => {
    try {
      const capture = await paypalIntegration.captureOrder(req.params.orderId);
      res.json(capture);
    } catch (error) {
      logger.error('Error capturing PayPal order:', error);
      res.status(500).json({ error: 'Failed to capture order' });
    }
  }
);

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripeIntegration.verifyWebhook(req.body, sig);
    logger.info('Stripe webhook received', { type: event.type });
    res.json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

router.post('/paypal/webhook', async (req, res) => {
  try {
    const verified = await paypalIntegration.verifyWebhook(req.headers, req.body);
    if (verified) {
      logger.info('PayPal webhook received', { eventType: req.body.event_type });
      res.json({ received: true });
    } else {
      res.status(400).json({ error: 'Webhook verification failed' });
    }
  } catch (error) {
    logger.error('PayPal webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
