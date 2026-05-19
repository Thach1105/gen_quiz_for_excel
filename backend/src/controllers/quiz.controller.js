import { ObjectId } from "mongodb";
import { parseExcelFile, detectColumnMapping, transformToQuizFormat, validateQuizData } from "../services/excel.service.js";
import { getDB } from "../services/mongodb.service.js";
import { uploadFile } from "../services/cloudinary.service.js";
import logger from "../services/logger.service.js";

const normalizeTitlePart = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const getQuestionKeyword = (questions) => {
  const firstQuestion = normalizeTitlePart(questions?.[0]?.question);
  return firstQuestion.split(" ").filter(Boolean).slice(0, 8).join(" ");
};

const padDatePart = (value) => String(value).padStart(2, "0");

const formatTitleTime = (date = new Date()) =>
  `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;

const generateQuizTitle = (questions) => {
  const keyword = getQuestionKeyword(questions) || "Quiz";
  return `${keyword} - ${formatTitleTime()}`;
};

/**
 * Upload and parse Excel file
 */
export const uploadExcelFile = async (req, res, next) => {
  try {
    logger.info("Processing Excel file upload", { 
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      requestId: req.requestId 
    });
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

    logger.info("Excel file processed successfully", {
      fileName: req.file.originalname,
      questionCount: questions.length,
      requestId: req.requestId
    });
    
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
    
    logger.info("Creating new quiz", { 
      title: title || "Auto-generated",
      questionCount: questions?.length || 0,
      requestId: req.requestId 
    });

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
    const normalizedTitle = normalizeTitlePart(title);
    const quizData = {
      title: normalizedTitle || generateQuizTitle(questions),
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
    
    logger.info("Quiz created successfully", {
      quizId: result.insertedId.toString(),
      title: quizData.title,
      questionCount: questions.length,
      requestId: req.requestId
    });

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
    
    logger.info("Fetching quiz by ID", { quizId: id, requestId: req.requestId });

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }

    const db = getDB();
    const quiz = await db.collection("quizzes").findOne({ _id: new ObjectId(id) });
    
    if (!quiz) {
      logger.warn("Quiz not found", { quizId: id, requestId: req.requestId });
      return res.status(404).json({ error: "Quiz not found" });
    }
    
    logger.info("Quiz fetched successfully", { 
      quizId: id, 
      title: quiz.title,
      requestId: req.requestId 
    });

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
    
    logger.info("Fetching all quizzes", { 
      limit: parseInt(limit), 
      offset: parseInt(offset),
      requestId: req.requestId 
    });

    const db = getDB();
    const quizzes = await db
      .collection("quizzes")
      .find({})
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("quizzes").countDocuments();
    
    logger.info("Quizzes fetched successfully", { 
      count: quizzes.length, 
      total,
      requestId: req.requestId 
    });

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
    
    logger.info("Updating quiz", { 
      quizId: id, 
      updates: Object.keys(updates),
      requestId: req.requestId 
    });

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
    const safeUpdates = { ...updates };
    if (Object.prototype.hasOwnProperty.call(safeUpdates, "title")) {
      const normalizedTitle = normalizeTitlePart(safeUpdates.title);
      if (!normalizedTitle) {
        return res.status(400).json({ error: "Quiz title cannot be empty" });
      }
      safeUpdates.title = normalizedTitle;
    }

    await db.collection("quizzes").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...safeUpdates, updatedAt: new Date() } }
    );

    // Get updated quiz
    const updatedQuiz = await db.collection("quizzes").findOne({ _id: new ObjectId(id) });
    
    logger.info("Quiz updated successfully", { 
      quizId: id,
      title: updatedQuiz.title,
      requestId: req.requestId 
    });

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
    
    logger.info("Deleting quiz", { quizId: id, requestId: req.requestId });

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
    
    logger.info("Quiz deleted successfully", { 
      quizId: id,
      title: quiz.title,
      requestId: req.requestId 
    });

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
