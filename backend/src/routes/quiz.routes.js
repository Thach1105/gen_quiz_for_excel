import express from "express";
import {
  uploadExcelFile,
  extractQuizFromDocument,
  createQuiz,
  getQuizById,
  getAllQuizzes,
  updateQuiz,
  deleteQuiz,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/quiz.controller.js";
import { uploadDocument, uploadExcel } from "../middleware/upload.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/quiz/upload
 * @desc    Upload and parse Excel file
 * @access  Public
 */
router.post("/upload", uploadExcel, uploadExcelFile);

/**
 * @route   POST /api/quiz/extract-from-document
 * @desc    Extract quiz questions from PDF with Gemini
 * @access  Public
 */
router.post("/extract-from-document", uploadDocument, extractQuizFromDocument);

/**
 * @route   POST /api/quiz
 * @desc    Create a new quiz
 * @access  Public
 */
router.post("/", createQuiz);

/**
 * @route   GET /api/quiz
 * @desc    Get all quizzes
 * @access  Public
 */
router.get("/", getAllQuizzes);

router.get("/categories", getAllCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

/**
 * @route   GET /api/quiz/:id
 * @desc    Get quiz by ID
 * @access  Public
 */
router.get("/:id", getQuizById);

/**
 * @route   PUT /api/quiz/:id
 * @desc    Update quiz
 * @access  Public
 */
router.put("/:id", updateQuiz);

/**
 * @route   DELETE /api/quiz/:id
 * @desc    Delete quiz
 * @access  Public
 */
router.delete("/:id", deleteQuiz);

export default router;
