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

const normalizeCategoryName = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const serializeCategory = (category) => ({
  id: category._id,
  ...category,
  parentId: category.parentId?.toString?.() || null,
});

const serializeQuiz = (quiz) => ({
  id: quiz._id,
  ...quiz,
  categoryId: quiz.categoryId?.toString?.() || null,
});

const resolveCategoryId = async (db, categoryId) => {
  if (!categoryId) return null;

  if (!ObjectId.isValid(categoryId)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const objectId = new ObjectId(categoryId);
  const category = await db.collection("quizCategories").findOne({ _id: objectId });
  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 400;
    throw error;
  }

  return objectId;
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeSearchText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getSearchTokens = (value) => normalizeSearchText(value)
  .split(/\s+/)
  .map(token => token.trim())
  .filter(Boolean);

const buildSearchFilter = (tokens) => {
  if (tokens.length === 0) return null;

  return {
    $and: tokens.map(token => {
      const pattern = escapeRegex(token);
      return {
        $or: [
          { normalizedTitle: { $regex: pattern } },
          { normalizedDescription: { $regex: pattern } },
          { normalizedCategoryPath: { $regex: pattern } },
        ],
      };
    }),
  };
};

const getDescendantCategoryObjectIds = async (db, categoryId) => {
  if (!ObjectId.isValid(categoryId)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const categories = await db.collection("quizCategories").find({}).toArray();
  const rootId = new ObjectId(categoryId);
  const exists = categories.some(category => category._id.equals(rootId));
  if (!exists) {
    const error = new Error("Category not found");
    error.statusCode = 400;
    throw error;
  }

  const childrenByParent = new Map();
  categories.forEach(category => {
    const parentId = category.parentId?.toString?.();
    if (!parentId) return;
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) || []), category]);
  });

  const result = [rootId];
  const queue = [rootId.toString()];
  while (queue.length > 0) {
    const parentId = queue.shift();
    const children = childrenByParent.get(parentId) || [];
    children.forEach(child => {
      result.push(child._id);
      queue.push(child._id.toString());
    });
  }

  return result;
};

const buildCategoryPathMap = (categories) => {
  const categoryMap = new Map(categories.map(category => [category._id.toString(), category]));
  const pathMap = new Map();

  const getPath = (category) => {
    const categoryId = category._id.toString();
    if (pathMap.has(categoryId)) return pathMap.get(categoryId);

    const path = [category.name];
    let parent = category.parentId ? categoryMap.get(category.parentId.toString()) : null;
    const seen = new Set([categoryId]);
    while (parent && !seen.has(parent._id.toString())) {
      seen.add(parent._id.toString());
      path.unshift(parent.name);
      parent = parent.parentId ? categoryMap.get(parent.parentId.toString()) : null;
    }

    const value = path.join(" ");
    pathMap.set(categoryId, value);
    return value;
  };

  categories.forEach(category => getPath(category));
  return pathMap;
};

const enrichQuizSearchFields = (quiz, categoryPathMap) => ({
  ...quiz,
  normalizedTitle: normalizeSearchText(quiz.title),
  normalizedDescription: normalizeSearchText(quiz.description),
  normalizedCategoryPath: normalizeSearchText(categoryPathMap.get(quiz.categoryId?.toString?.()) || ""),
});

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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Create a new quiz
 */
export const createQuiz = async (req, res, next) => {
  try {
    const { title, description, questions, settings, categoryId } = req.body;
    
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

    const db = getDB();
    const resolvedCategoryId = await resolveCategoryId(db, categoryId);

    // Create quiz document
    const normalizedTitle = normalizeTitlePart(title);
    const quizData = {
      title: normalizedTitle || generateQuizTitle(questions),
      description: description || "",
      questions,
      categoryId: resolvedCategoryId,
      settings: {
        timeLimit: settings?.timeLimit || 30,
        shuffle: settings?.shuffle ?? true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to MongoDB
    const result = await db.collection("quizzes").insertOne(quizData);
    
    logger.info("Quiz created successfully", {
      quizId: result.insertedId.toString(),
      title: quizData.title,
      questionCount: questions.length,
      requestId: req.requestId
    });

    res.status(201).json({
      success: true,
      data: serializeQuiz({ _id: result.insertedId, ...quizData }),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
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
      data: serializeQuiz(quiz),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Get all quizzes
 */
export const getAllQuizzes = async (req, res, next) => {
  try {
    const limit = Math.max(Number.parseInt(req.query.limit, 10) || 10, 1);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const search = String(req.query.search || "").trim();
    const categoryId = String(req.query.categoryId || "all");
    const sortBy = String(req.query.sortBy || "latest");
    const searchTokens = getSearchTokens(search);

    logger.info("Fetching all quizzes", {
      limit,
      offset,
      search,
      categoryId,
      sortBy,
      requestId: req.requestId,
    });

    const db = getDB();
    const match = {};

    if (categoryId === "uncategorized") {
      match.$or = [{ categoryId: null }, { categoryId: { $exists: false } }];
    } else if (categoryId !== "all") {
      match.categoryId = { $in: await getDescendantCategoryObjectIds(db, categoryId) };
    }

    const categories = await db.collection("quizCategories").find({}).toArray();
    const categoryPathMap = buildCategoryPathMap(categories);
    const rawQuizzes = await db.collection("quizzes").find(match).toArray();
    const searchFilter = buildSearchFilter(searchTokens);
    const searchableQuizzes = rawQuizzes.map(quiz => enrichQuizSearchFields(quiz, categoryPathMap));
    const matchedQuizzes = searchFilter
      ? searchableQuizzes.filter(quiz => searchFilter.$and.every(condition => condition.$or.some(fieldFilter => {
        const [fieldName, matcher] = Object.entries(fieldFilter)[0];
        return matcher.$regex.test ? matcher.$regex.test(quiz[fieldName] || "") : new RegExp(matcher.$regex).test(quiz[fieldName] || "");
      })))
      : searchableQuizzes;

    const sortedQuizzes = [...matchedQuizzes].sort((a, b) => {
      if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""), "vi");
      if (sortBy === "questions") return (b.questions?.length || 0) - (a.questions?.length || 0);
      if (sortBy === "time") return (b.settings?.timeLimit || 0) - (a.settings?.timeLimit || 0);
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });

    const total = sortedQuizzes.length;
    const quizzes = sortedQuizzes.slice(offset, offset + limit);

    logger.info("Quizzes fetched successfully", {
      count: quizzes.length,
      total,
      requestId: req.requestId,
    });

    res.status(200).json({
      success: true,
      data: quizzes.map(serializeQuiz),
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};;

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

    if (Object.prototype.hasOwnProperty.call(safeUpdates, "categoryId")) {
      safeUpdates.categoryId = await resolveCategoryId(db, safeUpdates.categoryId);
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
      data: serializeQuiz(updatedQuiz),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * Delete quiz
 */
export const getAllCategories = async (req, res, next) => {
  try {
    const db = getDB();
    const categories = await db.collection("quizCategories").find({}).sort({ name: 1 }).toArray();

    res.status(200).json({
      success: true,
      data: categories.map(serializeCategory),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, parentId } = req.body;
    const normalizedName = normalizeCategoryName(name);
    if (!normalizedName) {
      return res.status(400).json({ error: "Category name cannot be empty" });
    }

    const db = getDB();
    const resolvedParentId = await resolveCategoryId(db, parentId);
    const categoryData = {
      name: normalizedName,
      parentId: resolvedParentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("quizCategories").insertOne(categoryData);

    res.status(201).json({
      success: true,
      data: serializeCategory({ _id: result.insertedId, ...categoryData }),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const db = getDB();
    const categoryId = new ObjectId(id);
    const category = await db.collection("quizCategories").findOne({ _id: categoryId });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    const safeUpdates = {};
    if (Object.prototype.hasOwnProperty.call(updates, "name")) {
      const normalizedName = normalizeCategoryName(updates.name);
      if (!normalizedName) {
        return res.status(400).json({ error: "Category name cannot be empty" });
      }
      safeUpdates.name = normalizedName;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "parentId")) {
      const resolvedParentId = await resolveCategoryId(db, updates.parentId);
      if (resolvedParentId?.equals(categoryId)) {
        return res.status(400).json({ error: "Category cannot be its own parent" });
      }
      safeUpdates.parentId = resolvedParentId;
    }

    await db.collection("quizCategories").updateOne(
      { _id: categoryId },
      { $set: { ...safeUpdates, updatedAt: new Date() } }
    );

    const updatedCategory = await db.collection("quizCategories").findOne({ _id: categoryId });

    res.status(200).json({
      success: true,
      data: serializeCategory(updatedCategory),
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const db = getDB();
    const categoryId = new ObjectId(id);
    const category = await db.collection("quizCategories").findOne({ _id: categoryId });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await db.collection("quizzes").updateMany(
      { categoryId },
      { $set: { categoryId: null, updatedAt: new Date() } }
    );
    await db.collection("quizCategories").updateMany(
      { parentId: categoryId },
      { $set: { parentId: null, updatedAt: new Date() } }
    );
    await db.collection("quizCategories").deleteOne({ _id: categoryId });

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};
