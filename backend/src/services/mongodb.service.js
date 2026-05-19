import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import logger from "./logger.service.js";

dotenv.config();

let db = null;
let client = null;

/**
 * Connect to MongoDB Atlas
 */
export const connectDB = async () => {
  try {
    if (db) {
      logger.info("MongoDB already connected");
      return db;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    client = new MongoClient(uri);
    await client.connect();
    
    db = client.db(process.env.MONGODB_DB || "excel-to-quiz");
    logger.info("MongoDB connected successfully", { database: process.env.MONGODB_DB || "excel-to-quiz" });
    
    return db;
  } catch (error) {
    logger.error("MongoDB connection error", { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Get database instance
 */
export const getDB = () => {
  if (!db) {
    throw new Error("Database not connected. Call connectDB first.");
  }
  return db;
};

/**
 * Close database connection
 */
export const closeDB = async () => {
  if (client) {
    await client.close();
    db = null;
    client = null;
    logger.info("MongoDB connection closed");
  }
};

export default { connectDB, getDB, closeDB };
