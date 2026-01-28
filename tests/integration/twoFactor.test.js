const request = require('supertest');
const app = require('../../api/gateway/server');
const { generateToken } = require('../../platform-core/utils/jwt');

describe('2FA API Endpoints', () => {
  let authToken;

  beforeAll(() => {
    authToken = generateToken({ id: 'test-user-id', email: 'test@example.com', role: 'user' });
  });

  describe('POST /api/v1/2fa/setup', () => {
    it('should generate 2FA secret and QR code', async () => {
      const response = await request(app)
        .post('/api/v1/2fa/setup')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('secret');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('otpauthUrl');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/v1/2fa/setup');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/2fa/status', () => {
    it('should return 2FA status', async () => {
      const response = await request(app)
        .get('/api/v1/2fa/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
      expect(typeof response.body.enabled).toBe('boolean');
    });
  });

  describe('POST /api/v1/2fa/verify', () => {
    it('should reject invalid token format', async () => {
      const response = await request(app)
        .post('/api/v1/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '12345' });

      expect(response.status).toBe(400);
    });
  });
});
