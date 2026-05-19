import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import quizRoutes from "./routes/quiz.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { connectDB } from "./services/mongodb.service.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const parseAllowedOrigins = (value) =>
  String(value || "http://localhost:3000")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const escapeRegExp = (value) => value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;
  if (allowedOrigins.includes("*")) return true;

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) return true;
    if (!allowedOrigin.includes("*")) return false;

    const pattern = `^${escapeRegExp(allowedOrigin).replace(/\*/g, ".*")}$`;
    return new RegExp(pattern).test(origin);
  });
};

// Security middleware
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/quiz", quizRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("MongoDB connected successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
