const WebSocket = require('ws');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');

class NotificationServer {
  constructor() {
    this.wss = null;
    this.clients = new Map();
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket notification server initialized');
  }

  handleConnection(ws, req) {
    const token = this.extractToken(req);

    if (!token) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      this.clients.set(userId, ws);
      logger.info('WebSocket client connected', { userId });

      ws.on('message', (message) => {
        this.handleMessage(userId, message);
      });

      ws.on('close', () => {
        this.clients.delete(userId);
        logger.info('WebSocket client disconnected', { userId });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error, { userId });
      });

      ws.send(JSON.stringify({ type: 'connected', message: 'Connected to notification server' }));
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Invalid token');
    }
  }

  handleMessage(userId, message) {
    try {
      const data = JSON.parse(message);
      logger.info('WebSocket message received', { userId, type: data.type });

      if (data.type === 'ping') {
        this.sendToUser(userId, { type: 'pong' });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
    }
  }

  sendToUser(userId, data) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  broadcastToAll(data) {
    let sent = 0;
    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
        sent++;
      }
    });
    logger.info('Broadcast message sent', { recipients: sent });
    return sent;
  }

  sendNotification(userId, notification) {
    return this.sendToUser(userId, {
      type: 'notification',
      data: notification
    });
  }

  extractToken(req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    return url.searchParams.get('token');
  }

  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  isUserConnected(userId) {
    return this.clients.has(userId);
  }

  close() {
    this.clients.forEach((client) => {
      client.close();
    });
    if (this.wss) {
      this.wss.close();
    }
    logger.info('WebSocket server closed');
  }
}

module.exports = new NotificationServer();
