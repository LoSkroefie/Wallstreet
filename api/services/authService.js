const bcrypt = require('bcrypt');
const { query, transaction } = require('../../platform-core/config/database');
const { generateToken, generateRefreshToken } = require('../../platform-core/utils/jwt');
const logger = require('../../platform-core/config/logger');

const register = async (userData) => {
  const { email, password, firstName, lastName, phone } = userData;

  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);

  if (existingUser.rows.length > 0) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, role, created_at`,
    [email, passwordHash, firstName, lastName, phone || null]
  );

  const user = result.rows[0];

  await query(
    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
    [user.id, 'USER_REGISTERED', 'user', user.id]
  );

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });

  logger.info(`User registered: ${email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
    },
    token,
    refreshToken,
  };
};

const login = async (email, password, ipAddress, userAgent) => {
  const result = await query(
    'SELECT id, email, password_hash, first_name, last_name, role, status FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  if (user.status !== 'active') {
    throw new Error('Account is not active');
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    await query(
      'INSERT INTO audit_logs (user_id, action, resource_type, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [user.id, 'LOGIN_FAILED', 'user', ipAddress, userAgent]
    );
    throw new Error('Invalid email or password');
  }

  await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  await query(
    'INSERT INTO audit_logs (user_id, action, resource_type, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
    [user.id, 'LOGIN_SUCCESS', 'user', ipAddress, userAgent]
  );

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });

  logger.info(`User logged in: ${email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    },
    token,
    refreshToken,
  };
};

const getUserProfile = async (userId) => {
  const result = await query(
    `SELECT id, email, first_name, last_name, phone, role, status, 
            email_verified, created_at, last_login
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.email_verified,
    createdAt: user.created_at,
    lastLogin: user.last_login,
  };
};

const updateUserProfile = async (userId, updateData) => {
  const { firstName, lastName, phone } = updateData;

  const updates = [];
  const values = [];
  let paramCount = 1;

  if (firstName) {
    updates.push(`first_name = $${paramCount++}`);
    values.push(firstName);
  }

  if (lastName) {
    updates.push(`last_name = $${paramCount++}`);
    values.push(lastName);
  }

  if (phone !== undefined) {
    updates.push(`phone = $${paramCount++}`);
    values.push(phone);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
     RETURNING id, email, first_name, last_name, phone, role`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  await query(
    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
    [userId, 'PROFILE_UPDATED', 'user', userId]
  );

  const user = result.rows[0];

  logger.info(`User profile updated: ${userId}`);

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    role: user.role,
  };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = result.rows[0];
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, userId]);

  await query(
    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
    [userId, 'PASSWORD_CHANGED', 'user', userId]
  );

  logger.info(`Password changed for user: ${userId}`);

  return { message: 'Password changed successfully' };
};

module.exports = {
  register,
  login,
  getUserProfile,
  updateUserProfile,
  changePassword,
};
