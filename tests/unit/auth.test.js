const { authService } = require('../../api/services');
const { query } = require('../../platform-core/config/database');

jest.mock('../../platform-core/config/database');
jest.mock('bcrypt');
jest.mock('../../platform-core/config/logger');

describe('Auth Service', () => {
  describe('register', () => {
    it('should successfully register a new user', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'user',
            created_at: new Date(),
          },
        ],
      });

      query.mockResolvedValueOnce({ rows: [] });

      const bcrypt = require('bcrypt');
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword');

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error if email already exists', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: '123' }] });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            email: 'test@example.com',
            password_hash: 'hashedPassword',
            first_name: 'Test',
            last_name: 'User',
            role: 'user',
            status: 'active',
          },
        ],
      });

      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] });

      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'Password123!', '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid email', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login('nonexistent@example.com', 'password', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            email: 'test@example.com',
            password_hash: 'hashedPassword',
            first_name: 'Test',
            last_name: 'User',
            role: 'user',
            status: 'active',
          },
        ],
      });

      query.mockResolvedValueOnce({ rows: [] });

      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(
        authService.login('test@example.com', 'wrongpassword', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid email or password');
    });
  });
});
