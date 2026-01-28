const request = require('supertest');
const app = require('../../api/gateway/server');
const { generateToken } = require('../../platform-core/utils/jwt');

describe('Analytics API Endpoints', () => {
  let authToken;
  let adminToken;

  beforeAll(() => {
    authToken = generateToken({ id: 'test-user-id', email: 'test@example.com', role: 'user' });
    adminToken = generateToken({ id: 'admin-user-id', email: 'admin@example.com', role: 'admin' });
  });

  describe('POST /api/v1/analytics/track', () => {
    it('should track an analytics event', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventType: 'user_action',
          eventName: 'button_click',
          properties: { button: 'submit' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Event tracked');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventType: 'user_action'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/analytics/user/stats', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/user/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/analytics/platform/stats', () => {
    it('should allow admin access', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/platform/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/platform/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/active-users', () => {
    it('should return active user count', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/active-users?period=24h')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('period');
    });
  });
});
