import logger from "../services/logger.service.js";
import { randomBytes } from "crypto";

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${randomBytes(8).toString("hex")}`;
};

/**
 * Get client IP address
 */
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

/**
 * Sanitize request body for logging
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sensitiveFields = ["password", "token", "apiKey", "secret", "authorization"];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "***REDACTED***";
    }
  }

  return sanitized;
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  // Generate and attach request ID
  req.requestId = generateRequestId();
  
  // Capture request start time
  const startTime = Date.now();
  
  // Get request details
  const clientIp = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";
  
  // Log incoming request
  logger.http("Incoming request", {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: clientIp,
    userAgent,
    body: sanitizeRequestBody(req.body),
    query: req.query,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;
    
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "http";
    
    logger[logLevel]("Request completed", {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      duration: `${duration}ms`,
      ip: clientIp,
    });
    
    return originalSend.call(this, data);
  };

  next();
};

export default requestLogger;
