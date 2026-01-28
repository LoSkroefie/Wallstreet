const logger = require('../config/logger');
const axios = require('axios');

class PayPalIntegration {
  constructor() {
    this.clientId = null;
    this.clientSecret = null;
    this.baseURL = null;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.initialized = false;
  }

  initialize(config) {
    try {
      const { clientId, clientSecret, sandbox = true } = config;

      if (!clientId || !clientSecret) {
        throw new Error('PayPal client ID and secret are required');
      }

      this.clientId = clientId;
      this.clientSecret = clientSecret;
      this.baseURL = sandbox
        ? 'https://api-m.sandbox.paypal.com'
        : 'https://api-m.paypal.com';
      
      this.initialized = true;
      logger.info('PayPal integration initialized', { sandbox });
    } catch (error) {
      logger.error('Error initializing PayPal:', error);
      throw error;
    }
  }

  async getAccessToken() {
    this.ensureInitialized();

    try {
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post(
        `${this.baseURL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

      logger.info('PayPal access token obtained');
      return this.accessToken;
    } catch (error) {
      logger.error('Error getting PayPal access token:', error);
      throw error;
    }
  }

  async createOrder(orderData) {
    this.ensureInitialized();

    try {
      const token = await this.getAccessToken();
      const { amount, currency, description, returnUrl, cancelUrl } = orderData;

      const response = await axios.post(
        `${this.baseURL}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: currency || 'USD',
              value: amount.toFixed(2)
            },
            description: description || 'Payment'
          }],
          application_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('PayPal order created', { orderId: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('Error creating PayPal order:', error);
      throw error;
    }
  }

  async captureOrder(orderId) {
    this.ensureInitialized();

    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseURL}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('PayPal order captured', { orderId });
      return response.data;
    } catch (error) {
      logger.error('Error capturing PayPal order:', error);
      throw error;
    }
  }

  async getOrder(orderId) {
    this.ensureInitialized();

    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseURL}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error getting PayPal order:', error);
      throw error;
    }
  }

  async createPayout(payoutData) {
    this.ensureInitialized();

    try {
      const token = await this.getAccessToken();
      const { recipientEmail, amount, currency, note } = payoutData;

      const response = await axios.post(
        `${this.baseURL}/v1/payments/payouts`,
        {
          sender_batch_header: {
            sender_batch_id: `batch_${Date.now()}`,
            email_subject: 'You have a payment',
            email_message: note || 'You have received a payment'
          },
          items: [{
            recipient_type: 'EMAIL',
            amount: {
              value: amount.toFixed(2),
              currency: currency || 'USD'
            },
            receiver: recipientEmail,
            note: note || 'Payment from Wallstreet'
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('PayPal payout created', { payoutBatchId: response.data.batch_header.payout_batch_id });
      return response.data;
    } catch (error) {
      logger.error('Error creating PayPal payout:', error);
      throw error;
    }
  }

  async refundCapture(captureId, amount, currency) {
    this.ensureInitialized();

    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseURL}/v2/payments/captures/${captureId}/refund`,
        amount ? {
          amount: {
            value: amount.toFixed(2),
            currency_code: currency || 'USD'
          }
        } : {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('PayPal refund created', { refundId: response.data.id });
      return response.data;
    } catch (error) {
      logger.error('Error creating PayPal refund:', error);
      throw error;
    }
  }

  async verifyWebhook(webhookEvent, headers) {
    this.ensureInitialized();

    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseURL}/v1/notifications/verify-webhook-signature`,
        {
          transmission_id: headers['paypal-transmission-id'],
          transmission_time: headers['paypal-transmission-time'],
          cert_url: headers['paypal-cert-url'],
          auth_algo: headers['paypal-auth-algo'],
          transmission_sig: headers['paypal-transmission-sig'],
          webhook_id: process.env.PAYPAL_WEBHOOK_ID,
          webhook_event: webhookEvent
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('PayPal webhook verified', { status: response.data.verification_status });
      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      logger.error('PayPal webhook verification failed:', error);
      return false;
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('PayPal integration not initialized. Call initialize() first.');
    }
  }
}

module.exports = new PayPalIntegration();
