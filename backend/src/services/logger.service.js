import dotenv from "dotenv";

dotenv.config();

// Log levels
export const LogLevel = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  HTTP: "HTTP",
  DEBUG: "DEBUG",
};

// ANSI color codes for console output
const colors = {
  ERROR: "\x1b[31m", // Red
  WARN: "\x1b[33m",  // Yellow
  INFO: "\x1b[36m",  // Cyan
  HTTP: "\x1b[35m",  // Magenta
  DEBUG: "\x1b[90m", // Gray
  RESET: "\x1b[0m",
};

/**
 * Format timestamp for logs
 */
const formatTimestamp = () => {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
         `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, "0")}`;
};

/**
 * Sanitize sensitive data from logs
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sensitiveKeys = [
    "password",
    "token",
    "apiKey",
    "api_key",
    "secret",
    "authorization",
    "cookie",
    "session",
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    const result = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in result) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const lowerKey = String(key).toLowerCase();
        
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
          result[key] = "***REDACTED***";
        } else if (typeof result[key] === "object" && result[key] !== null) {
          result[key] = sanitizeObject(result[key]);
        }
      }
    }

    return result;
  };

  return sanitizeObject(sanitized);
};

/**
 * Get log level from environment
 */
const getLogLevel = () => {
  const level = (process.env.LOG_LEVEL || "INFO").toUpperCase();
  return Object.values(LogLevel).includes(level) ? level : LogLevel.INFO;
};

/**
 * Check if log level should be logged
 */
const shouldLog = (level) => {
  const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.HTTP, LogLevel.DEBUG];
  const currentLevel = getLogLevel();
  const currentIndex = levels.indexOf(currentLevel);
  const messageIndex = levels.indexOf(level);
  
  return messageIndex <= currentIndex;
};

/**
 * Logger class
 */
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = formatTimestamp();
    const sanitizedMeta = sanitizeData(meta);
    
    if (this.isDevelopment) {
      // Colorful console output for development
      const color = colors[level] || colors.RESET;
      const metaStr = Object.keys(sanitizedMeta).length > 0 
        ? `\n${JSON.stringify(sanitizedMeta, null, 2)}` 
        : "";
      
      return `${color}[${timestamp}] [${level}]${colors.RESET} ${message}${metaStr}`;
    } else {
      // Structured JSON for production
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...sanitizedMeta,
      });
    }
  }

  /**
   * Log error message
   */
  error(message, meta = {}) {
    if (!shouldLog(LogLevel.ERROR)) return;
    
    const logMessage = this.formatMessage(LogLevel.ERROR, message, meta);
    console.error(logMessage);
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    if (!shouldLog(LogLevel.WARN)) return;
    
    const logMessage = this.formatMessage(LogLevel.WARN, message, meta);
    console.warn(logMessage);
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    if (!shouldLog(LogLevel.INFO)) return;
    
    const logMessage = this.formatMessage(LogLevel.INFO, message, meta);
    console.log(logMessage);
  }

  /**
   * Log HTTP request/response
   */
  http(message, meta = {}) {
    if (!shouldLog(LogLevel.HTTP)) return;
    
    const logMessage = this.formatMessage(LogLevel.HTTP, message, meta);
    console.log(logMessage);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    if (!shouldLog(LogLevel.DEBUG)) return;
    
    const logMessage = this.formatMessage(LogLevel.DEBUG, message, meta);
    console.log(logMessage);
  }

  /**
   * Log with custom level
   */
  log(level, message, meta = {}) {
    if (!shouldLog(level)) return;
    
    const logMessage = this.formatMessage(level, message, meta);
    console.log(logMessage);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
