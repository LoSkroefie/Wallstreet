const logger = require('../config/logger');

class StripeIntegration {
  constructor() {
    this.stripe = null;
    this.initialized = false;
  }

  initialize(apiKey) {
    try {
      if (!apiKey) {
        throw new Error('Stripe API key is required');
      }

      const Stripe = require('stripe');
      this.stripe = Stripe(apiKey);
      this.initialized = true;

      logger.info('Stripe integration initialized');
    } catch (error) {
      logger.error('Error initializing Stripe:', error);
      throw error;
    }
  }

  async createCustomer(customerData) {
    this.ensureInitialized();

    try {
      const { email, name, phone, metadata } = customerData;

      const customer = await this.stripe.customers.create({
        email,
        name,
        phone,
        metadata: metadata || {}
      });

      logger.info('Stripe customer created', { customerId: customer.id });
      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  async createPaymentIntent(paymentData) {
    this.ensureInitialized();

    try {
      const { amount, currency, customerId, metadata, description } = paymentData;

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'usd',
        customer: customerId,
        metadata: metadata || {},
        description: description || 'Payment'
      });

      logger.info('Stripe payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    this.ensureInitialized();

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });

      logger.info('Payment intent confirmed', { paymentIntentId });
      return paymentIntent;
    } catch (error) {
      logger.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  async createRefund(chargeId, amount) {
    this.ensureInitialized();

    try {
      const refund = await this.stripe.refunds.create({
        charge: chargeId,
        amount: amount ? Math.round(amount * 100) : undefined
      });

      logger.info('Refund created', { refundId: refund.id, chargeId });
      return refund;
    } catch (error) {
      logger.error('Error creating refund:', error);
      throw error;
    }
  }

  async getPaymentIntent(paymentIntentId) {
    this.ensureInitialized();

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      logger.error('Error retrieving payment intent:', error);
      throw error;
    }
  }

  async listCustomerPayments(customerId, limit = 10) {
    this.ensureInitialized();

    try {
      const paymentIntents = await this.stripe.paymentIntents.list({
        customer: customerId,
        limit
      });

      return paymentIntents.data;
    } catch (error) {
      logger.error('Error listing customer payments:', error);
      throw error;
    }
  }

  async createSubscription(subscriptionData) {
    this.ensureInitialized();

    try {
      const { customerId, priceId, metadata } = subscriptionData;

      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: metadata || {}
      });

      logger.info('Subscription created', { subscriptionId: subscription.id });
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId) {
    this.ensureInitialized();

    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      logger.info('Subscription cancelled', { subscriptionId });
      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  async verifyWebhook(payload, signature, secret) {
    this.ensureInitialized();

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      logger.info('Stripe webhook verified', { eventType: event.type });
      return event;
    } catch (error) {
      logger.error('Stripe webhook verification failed:', error);
      throw error;
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Stripe integration not initialized. Call initialize() first.');
    }
  }
}

module.exports = new StripeIntegration();
