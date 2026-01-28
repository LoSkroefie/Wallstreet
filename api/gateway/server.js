const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const logger = require('../../platform-core/config/logger');
const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const { setupSwagger } = require('./swagger');
const notificationServer = require('../../platform-core/websocket/notificationServer');
const jobProcessor = require('../../platform-core/queue/jobProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  })
);

app.use(compression());

app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

app.use(apiRateLimiter);

setupSwagger(app);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Wallstreet API is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.API_VERSION || 'v1',
  });
});

app.get('/health/detailed', async (req, res) => {
  const { pool } = require('../../platform-core/config/database');
  const { redisClient } = require('../../platform-core/config/redis');

  const health = {
    success: true,
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    await pool.query('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.success = false;
    logger.error('Database health check failed:', error);
  }

  try {
    await redisClient.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.success = false;
    logger.error('Redis health check failed:', error);
  }

  const statusCode = health.success ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/health/db', async (req, res) => {
  const { pool } = require('../../platform-core/config/database');
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Database is healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Database is unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/health/redis', async (req, res) => {
  const { redisClient } = require('../../platform-core/config/redis');
  try {
    await redisClient.ping();
    res.status(200).json({
      success: true,
      message: 'Redis is healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Redis health check failed:', error);
    res.status(503).json({
      success: false,
      message: 'Redis is unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Wallstreet API Gateway',
    version: process.env.API_VERSION || 'v1',
    documentation: process.env.SWAGGER_PATH || '/api-docs',
    timestamp: new Date().toISOString(),
  });
});

const apiRoutes = require('./routes');
app.use('/api/v1', apiRoutes);

let server;

app.use(notFoundHandler);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, async () => {
    logger.info(`Wallstreet API Gateway running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    
    try {
      notificationServer.initialize(server);
      logger.info('WebSocket notification server initialized');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
    }
    
    try {
      await jobProcessor.start();
      logger.info('Job queue processors started');
    } catch (error) {
      logger.error('Failed to start job processors:', error);
    }
  });
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  
  try {
    notificationServer.close();
    await jobProcessor.stop();
    logger.info('Graceful shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  
  try {
    notificationServer.close();
    await jobProcessor.stop();
    logger.info('Graceful shutdown complete');
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  
  process.exit(0);
});

module.exports = app;
