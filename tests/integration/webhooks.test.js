const request = require('supertest');
const app = require('../../api/gateway/server');
const { generateToken } = require('../../platform-core/utils/jwt');

describe('Webhook API Endpoints', () => {
  let authToken;
  let webhookId;

  beforeAll(() => {
    authToken = generateToken({ id: 'test-user-id', email: 'test@example.com', role: 'user' });
  });

  describe('POST /api/v1/webhooks', () => {
    it('should create a new webhook', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['transaction.created', 'account.updated'],
          secret: 'test-secret'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      webhookId = response.body.id;
    });

    it('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'not-a-url',
          events: ['transaction.created']
        });

      expect(response.status).toBe(400);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/v1/webhooks')
        .send({
          url: 'https://example.com/webhook',
          events: ['transaction.created']
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/webhooks', () => {
    it('should list user webhooks', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
