const { query, transaction } = require('../../platform-core/config/database');
const { cache } = require('../../platform-core/config/redis');
const logger = require('../../platform-core/config/logger');

const generateAccountNumber = () => {
  const prefix = 'WS';
  const random = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
  return `${prefix}${random}`;
};

const createAccount = async (userId, accountData) => {
  const { accountType, currency = 'USD' } = accountData;

  const accountNumber = generateAccountNumber();

  const result = await query(
    `INSERT INTO accounts (user_id, account_number, account_type, currency)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, account_number, account_type, currency, balance, available_balance, status, created_at`,
    [userId, accountNumber, accountType, currency]
  );

  const account = result.rows[0];

  await query(
    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
    [userId, 'ACCOUNT_CREATED', 'account', account.id]
  );

  logger.info(`Account created: ${account.id} for user: ${userId}`);

  return {
    id: account.id,
    userId: account.user_id,
    accountNumber: account.account_number,
    accountType: account.account_type,
    currency: account.currency,
    balance: parseFloat(account.balance),
    availableBalance: parseFloat(account.available_balance),
    status: account.status,
    createdAt: account.created_at,
  };
};

const getAccountById = async (accountId, userId) => {
  const cacheKey = `account:${accountId}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const result = await query(
    `SELECT id, user_id, account_number, account_type, currency, balance, 
            available_balance, status, created_at, updated_at
     FROM accounts WHERE id = $1 AND user_id = $2`,
    [accountId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Account not found');
  }

  const account = result.rows[0];
  const accountData = {
    id: account.id,
    userId: account.user_id,
    accountNumber: account.account_number,
    accountType: account.account_type,
    currency: account.currency,
    balance: parseFloat(account.balance),
    availableBalance: parseFloat(account.available_balance),
    status: account.status,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  };

  await cache.set(cacheKey, accountData, 300);

  return accountData;
};

const getUserAccounts = async (userId) => {
  const result = await query(
    `SELECT id, account_number, account_type, currency, balance, 
            available_balance, status, created_at
     FROM accounts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(account => ({
    id: account.id,
    accountNumber: account.account_number,
    accountType: account.account_type,
    currency: account.currency,
    balance: parseFloat(account.balance),
    availableBalance: parseFloat(account.available_balance),
    status: account.status,
    createdAt: account.created_at,
  }));
};

const updateAccountBalance = async (accountId, amount, type = 'credit') => {
  return await transaction(async client => {
    const result = await client.query(
      'SELECT balance, available_balance FROM accounts WHERE id = $1 FOR UPDATE',
      [accountId]
    );

    if (result.rows.length === 0) {
      throw new Error('Account not found');
    }

    const currentBalance = parseFloat(result.rows[0].balance);
    let newBalance;

    if (type === 'credit') {
      newBalance = currentBalance + amount;
    } else if (type === 'debit') {
      if (currentBalance < amount) {
        throw new Error('Insufficient funds');
      }
      newBalance = currentBalance - amount;
    } else {
      throw new Error('Invalid transaction type');
    }

    await client.query(
      'UPDATE accounts SET balance = $1, available_balance = $1 WHERE id = $2',
      [newBalance, accountId]
    );

    await cache.del(`account:${accountId}`);

    logger.info(`Account balance updated: ${accountId}, type: ${type}, amount: ${amount}`);

    return newBalance;
  });
};

const getAccountBalance = async (accountId, userId) => {
  const result = await query(
    'SELECT balance, available_balance, currency FROM accounts WHERE id = $1 AND user_id = $2',
    [accountId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Account not found');
  }

  const account = result.rows[0];

  return {
    balance: parseFloat(account.balance),
    availableBalance: parseFloat(account.available_balance),
    currency: account.currency,
  };
};

const closeAccount = async (accountId, userId) => {
  const account = await getAccountById(accountId, userId);

  if (account.balance !== 0) {
    throw new Error('Cannot close account with non-zero balance');
  }

  await query('UPDATE accounts SET status = $1 WHERE id = $2', ['closed', accountId]);

  await query(
    'INSERT INTO audit_logs (user_id, action, resource_type, resource_id) VALUES ($1, $2, $3, $4)',
    [userId, 'ACCOUNT_CLOSED', 'account', accountId]
  );

  await cache.del(`account:${accountId}`);

  logger.info(`Account closed: ${accountId}`);

  return { message: 'Account closed successfully' };
};

module.exports = {
  createAccount,
  getAccountById,
  getUserAccounts,
  updateAccountBalance,
  getAccountBalance,
  closeAccount,
};
