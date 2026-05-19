import logger from "../services/logger.service.js";

export const errorHandler = (err, req, res, next) => {
  logger.error("Request error", { 
    error: err.message, 
    stack: err.stack,
    code: err.code,
    name: err.name,
    statusCode: err.statusCode
  });

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large",
      message: "File size should not exceed 10MB",
    });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      error: "Invalid file field",
      message: "Unexpected file field in upload",
    });
  }

  // Firebase errors
  if (err.code && err.code.startsWith("auth/")) {
    return res.status(401).json({
      error: "Authentication error",
      message: err.message,
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation error",
      message: err.message,
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
