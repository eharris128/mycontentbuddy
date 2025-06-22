import winston from 'winston';
import { Request } from 'express';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that we want to link the colors
winston.addColors(logColors);

// Define which logs to print based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  }),
];

// Create the winston logger
const logger = winston.createLogger({
  level: level(),
  levels: logLevels,
  transports,
  exitOnError: false,
});

// Helper interface for structured logging
interface LogMeta {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip?: string;
  error?: Error;
  tweetId?: string;
  rateLimitRemaining?: number;
  cacheHit?: boolean;
  [key: string]: any;
}

// Enhanced logging class with convenience methods
class Logger {
  private winston: winston.Logger;

  constructor(winstonLogger: winston.Logger) {
    this.winston = winstonLogger;
  }

  error(message: string, meta?: LogMeta): void {
    this.winston.error(message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.winston.warn(message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.winston.info(message, meta);
  }

  http(message: string, meta?: LogMeta): void {
    this.winston.http(message, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this.winston.debug(message, meta);
  }

  // Convenience methods for common use cases
  apiCall(message: string, meta: LogMeta = {}): void {
    this.info(`🌐 API: ${message}`, meta);
  }

  twitterApi(message: string, meta: LogMeta = {}): void {
    this.info(`🐦 Twitter API: ${message}`, meta);
  }

  auth(message: string, meta: LogMeta = {}): void {
    this.info(`🔐 Auth: ${message}`, meta);
  }

  cache(message: string, meta: LogMeta = {}): void {
    this.debug(`💾 Cache: ${message}`, meta);
  }

  rateLimit(message: string, meta: LogMeta = {}): void {
    this.info(`⏱️ Rate Limit: ${message}`, meta);
  }

  redis(message: string, meta: LogMeta = {}): void {
    this.debug(`🔴 Redis: ${message}`, meta);
  }

  tweet(message: string, meta: LogMeta = {}): void {
    this.info(`📝 Tweet: ${message}`, meta);
  }

  // Extract useful information from Express request
  extractRequestMeta(req: Request): LogMeta {
    return {
      method: req.method,
      endpoint: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      requestId: (req as any).requestId,
      userId: req.session?.oauth_token ? 'authenticated' : 'anonymous',
    };
  }

  // Log performance timing
  timing(operation: string, startTime: number, meta: LogMeta = {}): void {
    const duration = Date.now() - startTime;
    this.info(`⏱️ ${operation} completed in ${duration}ms`, { ...meta, responseTime: duration });
  }

  // Log errors with full context
  errorWithContext(message: string, error: Error, meta: LogMeta = {}): void {
    this.error(message, {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }
}

// Export singleton instance
export const log = new Logger(logger);
export default log;