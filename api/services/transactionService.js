const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../../platform-core/config/database');
const { cache } = require('../../platform-core/config/redis');
const accountService = require('./accountService');
const logger = require('../../platform-core/config/logger');

const generateReferenceNumber = () => {
  return `TXN-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`;
};

const createTransaction = async (userId, transactionData) => {
  const { accountId, amount, transactionType, currency = 'USD', description, metadata = {} } =
    transactionData;

  const account = await accountService.getAccountById(accountId, userId);

  if (account.status !== 'active') {
    throw new Error('Account is not active');
  }

  if (transactionType === 'withdrawal' && account.availableBalance < amount) {
    throw new Error('Insufficient funds');
  }

  const referenceNumber = generateReferenceNumber();

  return await transaction(async client => {
    const result = await client.query(
      `INSERT INTO transactions (account_id, transaction_type, amount, currency, 
                                  description, reference_number, metadata, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, account_id, transaction_type, amount, currency, status, 
                 description, reference_number, metadata, created_at`,
      [
        accountId,
        transactionType,
        amount,
        currency,
        description || null,
        referenceNumber,
        JSON.stringify(metadata),
        'pending',
      ]
    );

    const txn = result.rows[0];

    if (transactionType === 'deposit' || transactionType === 'credit') {
      await client.query(
        'UPDATE accounts SET available_balance = available_balance - $1 WHERE id = $2',
        [amount, accountId]
      );
    } else if (transactionType === 'withdrawal' || transactionType === 'debit') {
      await client.query(
        'UPDATE accounts SET available_balance = available_balance - $1 WHERE id = $2',
        [amount, accountId]
      );
    }

    await client.query(
      'INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'TRANSACTION_CREATED', 'transaction', txn.id, JSON.stringify({ amount, type: transactionType })]
    );

    await cache.del(`account:${accountId}`);

    logger.info(`Transaction created: ${txn.id}, type: ${transactionType}, amount: ${amount}`);

    return {
      id: txn.id,
      accountId: txn.account_id,
      transactionType: txn.transaction_type,
      amount: parseFloat(txn.amount),
      currency: txn.currency,
      status: txn.status,
      description: txn.description,
      referenceNumber: txn.reference_number,
      metadata: txn.metadata,
      createdAt: txn.created_at,
    };
  });
};

const processTransaction = async (transactionId) => {
  return await transaction(async client => {
    const result = await client.query(
      'SELECT id, account_id, transaction_type, amount, status FROM transactions WHERE id = $1 FOR UPDATE',
      [transactionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    const txn = result.rows[0];

    if (txn.status !== 'pending') {
      throw new Error('Transaction already processed');
    }

    const accountResult = await client.query(
      'SELECT balance, available_balance FROM accounts WHERE id = $1 FOR UPDATE',
      [txn.account_id]
    );

    if (accountResult.rows.length === 0) {
      throw new Error('Account not found');
    }

    const account = accountResult.rows[0];
    let newBalance = parseFloat(account.balance);
    let newAvailableBalance = parseFloat(account.available_balance);

    if (txn.transaction_type === 'deposit' || txn.transaction_type === 'credit') {
      newBalance += parseFloat(txn.amount);
      newAvailableBalance += parseFloat(txn.amount);
    } else if (txn.transaction_type === 'withdrawal' || txn.transaction_type === 'debit') {
      if (newBalance < parseFloat(txn.amount)) {
        await client.query('UPDATE transactions SET status = $1 WHERE id = $2', ['failed', transactionId]);
        throw new Error('Insufficient funds');
      }
      newBalance -= parseFloat(txn.amount);
    } else if (txn.transaction_type === 'transfer') {
    }

    await client.query(
      'UPDATE accounts SET balance = $1, available_balance = $2 WHERE id = $3',
      [newBalance, newAvailableBalance, txn.account_id]
    );

    await client.query(
      'UPDATE transactions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', transactionId]
    );

    await cache.del(`account:${txn.account_id}`);

    logger.info(`Transaction processed: ${transactionId}, status: completed`);

    return { message: 'Transaction processed successfully' };
  });
};

const getTransactionById = async (transactionId, userId) => {
  const result = await query(
    `SELECT t.id, t.account_id, t.transaction_type, t.amount, t.currency, t.status,
            t.description, t.reference_number, t.metadata, t.created_at, t.completed_at
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     WHERE t.id = $1 AND a.user_id = $2`,
    [transactionId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Transaction not found');
  }

  const txn = result.rows[0];

  return {
    id: txn.id,
    accountId: txn.account_id,
    transactionType: txn.transaction_type,
    amount: parseFloat(txn.amount),
    currency: txn.currency,
    status: txn.status,
    description: txn.description,
    referenceNumber: txn.reference_number,
    metadata: txn.metadata,
    createdAt: txn.created_at,
    completedAt: txn.completed_at,
  };
};

const getAccountTransactions = async (accountId, userId, options = {}) => {
  const { page = 1, limit = 20, status, type } = options;
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT t.id, t.transaction_type, t.amount, t.currency, t.status,
           t.description, t.reference_number, t.created_at, t.completed_at
    FROM transactions t
    INNER JOIN accounts a ON t.account_id = a.id
    WHERE t.account_id = $1 AND a.user_id = $2
  `;

  const params = [accountId, userId];
  let paramCount = 3;

  if (status) {
    queryText += ` AND t.status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  if (type) {
    queryText += ` AND t.transaction_type = $${paramCount}`;
    params.push(type);
    paramCount++;
  }

  queryText += ` ORDER BY t.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const result = await query(queryText, params);

  const countResult = await query(
    'SELECT COUNT(*) FROM transactions t INNER JOIN accounts a ON t.account_id = a.id WHERE t.account_id = $1 AND a.user_id = $2',
    [accountId, userId]
  );

  const total = parseInt(countResult.rows[0].count);

  return {
    transactions: result.rows.map(txn => ({
      id: txn.id,
      transactionType: txn.transaction_type,
      amount: parseFloat(txn.amount),
      currency: txn.currency,
      status: txn.status,
      description: txn.description,
      referenceNumber: txn.reference_number,
      createdAt: txn.created_at,
      completedAt: txn.completed_at,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  createTransaction,
  processTransaction,
  getTransactionById,
  getAccountTransactions,
};
