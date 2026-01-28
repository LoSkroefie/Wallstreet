const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wallstreet Platform API',
      version: '1.0.0',
      description: 'Modern API-driven financial technology platform with comprehensive integration capabilities',
      contact: {
        name: 'Wallstreet API Support',
        email: 'api@wallstreet.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://staging-api.wallstreet.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.wallstreet.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key for programmatic access',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            accountNumber: { type: 'string' },
            accountType: { type: 'string' },
            currency: { type: 'string' },
            balance: { type: 'number' },
            availableBalance: { type: 'number' },
            status: { type: 'string', enum: ['active', 'closed', 'suspended'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            accountId: { type: 'string', format: 'uuid' },
            transactionType: { type: 'string', enum: ['deposit', 'withdrawal', 'transfer'] },
            amount: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
            description: { type: 'string' },
            referenceNumber: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and profile management',
      },
      {
        name: 'Accounts',
        description: 'Account management operations',
      },
      {
        name: 'Transactions',
        description: 'Transaction processing and history',
      },
      {
        name: 'Health',
        description: 'System health checks',
      },
    ],
  },
  apis: ['./api/gateway/routes/*.js', './api/gateway/server.js'],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = app => {
  if (process.env.ENABLE_SWAGGER !== 'false') {
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customSiteTitle: 'Wallstreet API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
      })
    );
    console.log('📚 Swagger documentation available at /api-docs');
  }
};

module.exports = { setupSwagger, swaggerSpec };
