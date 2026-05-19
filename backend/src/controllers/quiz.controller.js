import { ObjectId } from "mongodb";
import { parseExcelFile, detectColumnMapping, transformToQuizFormat, validateQuizData } from "../services/excel.service.js";
import { getDB } from "../services/mongodb.service.js";
import { uploadFile } from "../services/cloudinary.service.js";

/**
 * Upload and parse Excel file
 */
export const uploadExcelFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse Excel file
    const rawData = parseExcelFile(req.file.buffer);
    
    // Detect column mapping
    const mapping = detectColumnMapping(rawData);
    
    // Transform to quiz format
    const questions = transformToQuizFormat(rawData, mapping);
    
    // Validate quiz data
    const validation = validateQuizData(questions);
    
    if (!validation.valid) {
      return res.status(400).json({
        error: "Invalid quiz data",
        details: validation.errors,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        questions,
        mapping,
        validation,
        fileName: req.file.originalname,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new quiz
 */
export const createQuiz = async (req, res, next) => {
  try {
    const { title, description, questions, settings } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: "No questions provided" });
    }

    // Validate quiz data
    const validation = validateQuizData(questions);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Invalid quiz data",
        details: validation.errors,
      });
    }

    // Create quiz document
    const quizData = {
      title: title || "Untitled Quiz",
      description: description || "",
      questions,
      settings: {
        timeLimit: settings?.timeLimit || 30,
        shuffle: settings?.shuffle ?? true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to MongoDB
    const db = getDB();
    const result = await db.collection("quizzes").insertOne(quizData);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...quizData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get quiz by ID
 */
export const getQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    const db = getDB();
    const quiz = await db.collection("quizzes").findOne({ _id: new ObjectId(id) });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        id: quiz._id,
        ...quiz,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all quizzes
 */
export const getAllQuizzes = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const db = getDB();
    const quizzes = await db
      .collection("quizzes")
      .find({})
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("quizzes").countDocuments();

    res.status(200).json({
      success: true,
      data: quizzes.map(quiz => ({
        id: quiz._id,
        ...quiz,
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quiz
 */
export const updateQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    // Check if quiz exists
    const db = getDB();
    const quiz = await db.collection("quizzes").findOne({ _id: new ObjectId(id) });
    
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Update quiz
    await db.collection("quizzes").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    // Get updated quiz
    const updatedQuiz = await db.collection("quizzes").findOne({ _id: new ObjectId(id) });

    res.status(200).json({
      success: true,
      data: {
        id: updatedQuiz._id,
        ...updatedQuiz,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete quiz
 */
export const deleteQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    // Check if quiz exists
    const db = getDB();
    const quiz = await db.collection("quizzes").findOne({ _id: new ObjectId(id) });
    
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Delete quiz
    await db.collection("quizzes").deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
