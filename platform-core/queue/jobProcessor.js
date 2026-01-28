const logger = require('../config/logger');
const Queue = require('bull');
const Redis = require('ioredis');

class JobProcessor {
  constructor() {
    this.queues = new Map();
    this.redis = null;
    this.initialized = false;
  }

  initialize(redisConfig) {
    try {
      this.redis = new Redis(redisConfig || process.env.REDIS_URL);
      
      this.createQueue('email', this.processEmail);
      this.createQueue('webhook', this.processWebhook);
      this.createQueue('analytics', this.processAnalytics);
      this.createQueue('notification', this.processNotification);
      this.createQueue('report', this.processReport);

      this.initialized = true;
      logger.info('Job processor initialized with queues:', Array.from(this.queues.keys()));
    } catch (error) {
      logger.error('Error initializing job processor:', error);
      throw error;
    }
  }

  createQueue(name, processor) {
    const queue = new Queue(name, {
      redis: process.env.REDIS_URL,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: false
      }
    });

    queue.process(async (job) => {
      try {
        logger.info(`Processing ${name} job`, { jobId: job.id, data: job.data });
        await processor.call(this, job);
        logger.info(`${name} job completed`, { jobId: job.id });
      } catch (error) {
        logger.error(`Error processing ${name} job:`, error, { jobId: job.id });
        throw error;
      }
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed`, { queue: name, error: err.message, attempts: job.attemptsMade });
    });

    queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`, { queue: name });
    });

    this.queues.set(name, queue);
    return queue;
  }

  async addJob(queueName, jobData, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    try {
      const job = await queue.add(jobData, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        ...options
      });

      logger.info(`Job added to ${queueName}`, { jobId: job.id });
      return job;
    } catch (error) {
      logger.error(`Error adding job to ${queueName}:`, error);
      throw error;
    }
  }

  async processEmail(job) {
    const { to, subject, body, template } = job.data;

    logger.info('Processing email', { to, subject });

    await this.delay(1000);

    return { sent: true, to, subject };
  }

  async processWebhook(job) {
    const { url, payload, eventType } = job.data;

    logger.info('Processing webhook', { url, eventType });

    const axios = require('axios');
    try {
      await axios.post(url, payload, { timeout: 10000 });
      return { delivered: true };
    } catch (error) {
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  }

  async processAnalytics(job) {
    const { eventType, eventData, userId } = job.data;

    logger.info('Processing analytics event', { eventType, userId });

    await this.delay(500);

    return { processed: true, eventType };
  }

  async processNotification(job) {
    const { userId, type, message, data } = job.data;

    logger.info('Processing notification', { userId, type });

    await this.delay(800);

    return { sent: true, userId, type };
  }

  async processReport(job) {
    const { reportType, filters, userId } = job.data;

    logger.info('Processing report', { reportType, userId });

    await this.delay(3000);

    return { generated: true, reportType };
  }

  async getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      queue: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed
    };
  }

  async getAllQueueStats() {
    const stats = {};
    for (const [name, queue] of this.queues) {
      stats[name] = await this.getQueueStats(name);
    }
    return stats;
  }

  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
  }

  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
  }

  async cleanQueue(queueName, grace = 0, limit = 100) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.clean(grace, 'completed', limit);
    await queue.clean(grace, 'failed', limit);
    logger.info(`Queue ${queueName} cleaned`);
  }

  async closeAll() {
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue ${name} closed`);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new JobProcessor();
