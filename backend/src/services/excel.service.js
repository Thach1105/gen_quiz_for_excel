import XLSX from "xlsx";

const repairMojibake = (value) => {
  try {
    return Buffer.from(String(value ?? ""), "latin1").toString("utf8");
  } catch {
    return String(value ?? "");
  }
};

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/[\u0111\u0110]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizedCandidates = (value) => {
  const raw = String(value ?? "");
  return [...new Set([normalizeText(raw), normalizeText(repairMojibake(raw))])];
};

const columnMatches = (column, patterns) =>
  patterns.some(pattern =>
    normalizedCandidates(column).some(candidate => candidate === pattern || candidate.includes(pattern))
  );

const isQuestionTypeText = (value) =>
  normalizedCandidates(value).some(candidate =>
    /\bsingle\b/.test(candidate) ||
    /\bmultiple\b/.test(candidate) ||
    /\bmulti(?:\s+choice)?\b/.test(candidate) ||
    /\bcheckbox(?:es)?\b/.test(candidate) ||
    /\bchon\s+nhieu\b/.test(candidate) ||
    /\bnhieu(?:\s+(?:dap\s+an|lua\s+chon))?\b/.test(candidate)
  );

const isMultipleChoiceText = (value) =>
  normalizedCandidates(value).some(candidate =>
    /\bmultiple\b/.test(candidate) ||
    /\bmulti(?:\s+choice)?\b/.test(candidate) ||
    /\bcheckbox(?:es)?\b/.test(candidate) ||
    /\bchon\s+nhieu\b/.test(candidate) ||
    /\bnhieu(?:\s+(?:dap\s+an|lua\s+chon))?\b/.test(candidate)
  );

const normalizeQuestionType = (value) =>
  isMultipleChoiceText(value) ? "Multiple choice" : "Single choice";

const readCell = (row, columnName, fallback = "") => {
  if (!columnName) return fallback;
  const value = row[columnName];
  return value === undefined || value === null ? fallback : value;
};

const readOption = (row, columnName) => {
  const option = String(readCell(row, columnName)).trim();
  return option && !isQuestionTypeText(option) ? option : null;
};

const splitAnswerCodes = (answer) =>
  String(answer ?? "")
    .split(/[,;\n|]+/)
    .map(item => item.trim().toUpperCase())
    .filter(Boolean);

const parseAnswerTextByOptions = (answer, optionValues) => {
  const parsedAnswers = [];
  let remaining = String(answer ?? "").trim();
  const sortedOptions = [...optionValues].sort((a, b) => b.length - a.length);

  while (remaining) {
    const matchedOption = sortedOptions.find(option => {
      if (!remaining.startsWith(option)) return false;
      const nextChar = remaining.slice(option.length, option.length + 1);
      return nextChar === "" || /[,;\n|]/.test(nextChar);
    });

    if (!matchedOption) return null;

    parsedAnswers.push(matchedOption);
    remaining = remaining.slice(matchedOption.length).trim();

    if (remaining) {
      if (!/^[,;\n|]/.test(remaining)) return null;
      remaining = remaining.slice(1).trim();
    }
  }

  return parsedAnswers;
};

const normalizeCorrectAnswer = (rawAnswer, optionMap) => {
  const answerText = String(rawAnswer ?? "").trim();
  if (!answerText) return [];

  const validKeys = Object.keys(optionMap).filter(key => optionMap[key]);
  const optionValues = validKeys.map(key => optionMap[key]);
  const exactOption = optionValues.find(option => option === answerText);
  if (exactOption) return [exactOption];

  const answerCodes = splitAnswerCodes(answerText);
  const allTokensAreOptionCodes =
    answerCodes.length > 0 &&
    answerCodes.every(code => validKeys.includes(code));

  if (allTokensAreOptionCodes) {
    return [...new Set(answerCodes)].map(code => optionMap[code]);
  }

  const parsedByOptionText = parseAnswerTextByOptions(answerText, optionValues);
  if (parsedByOptionText && parsedByOptionText.length > 0) {
    return parsedByOptionText;
  }

  return [answerText];
};

/**
 * Parse Excel file buffer and extract quiz data.
 * @param {Buffer} fileBuffer - File buffer
 * @returns {Array} Parsed sheet rows
 */
export const parseExcelFile = (fileBuffer) => {
  try {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      throw new Error("Excel file is empty or invalid");
    }

    return data;
  } catch (error) {
    console.error("Error parsing Excel file:", error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Detect column mapping from Excel data.
 * @param {Array} data - Raw Excel data
 * @returns {Object} Column mapping
 */
export const detectColumnMapping = (data) => {
  if (!data || data.length === 0) {
    throw new Error("No data to detect columns");
  }

  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  const mapping = {
    question: null,
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctAnswer: null,
    type: null,
    explanation: null,
  };

  const patterns = {
    question: ["cau hoi", "cauhoi", "question", "question text", "noi dung"],
    correctAnswer: ["dap an dung", "correct answer", "correct answers", "dap an", "answer", "answers"],
    type: ["loai cau", "kieu cau", "dang cau", "type", "question type"],
    explanation: ["giai thich", "explanation", "explain", "reason", "rationale", "feedback"],
  };

  for (const col of columns) {
    const colLower = normalizeText(col);

    if (!mapping.optionA && ["a", "option a", "lua chon a"].includes(colLower)) {
      mapping.optionA = col;
      continue;
    }
    if (!mapping.optionB && ["b", "option b", "lua chon b"].includes(colLower)) {
      mapping.optionB = col;
      continue;
    }
    if (!mapping.optionC && ["c", "option c", "lua chon c"].includes(colLower)) {
      mapping.optionC = col;
      continue;
    }
    if (!mapping.optionD && ["d", "option d", "lua chon d"].includes(colLower)) {
      mapping.optionD = col;
      continue;
    }

    if (!mapping.question && columnMatches(col, patterns.question)) {
      mapping.question = col;
      continue;
    }
    if (!mapping.correctAnswer && columnMatches(col, patterns.correctAnswer)) {
      mapping.correctAnswer = col;
      continue;
    }
    if (!mapping.type && columnMatches(col, patterns.type)) {
      mapping.type = col;
      continue;
    }
    if (!mapping.explanation && columnMatches(col, patterns.explanation)) {
      mapping.explanation = col;
    }
  }

  return mapping;
};

/**
 * Transform Excel data to quiz format.
 * @param {Array} data - Raw Excel data
 * @param {Object} mapping - Column mapping
 * @returns {Array} Quiz questions
 */
export const transformToQuizFormat = (data, mapping) => {
  try {
    const questions = data.map((row, index) => {
      const optionMap = {
        A: readOption(row, mapping.optionA),
        B: readOption(row, mapping.optionB),
        C: readOption(row, mapping.optionC),
        D: readOption(row, mapping.optionD),
      };
      const options = Object.values(optionMap).filter(Boolean);

      const question = {
        id: index + 1,
        question: String(readCell(row, mapping.question)).trim(),
        options,
        answer: normalizeCorrectAnswer(readCell(row, mapping.correctAnswer), optionMap),
        type: normalizeQuestionType(readCell(row, mapping.type, "Single choice")),
        explanation: String(readCell(row, mapping.explanation)).trim(),
      };

      if (!question.question || question.options.length < 2) {
        console.warn(`Skipping invalid question at row ${index + 1}`);
        return null;
      }

      return question;
    });

    return questions.filter(q => q !== null);
  } catch (error) {
    console.error("Error transforming data:", error);
    throw new Error(`Failed to transform data: ${error.message}`);
  }
};

/**
 * Validate quiz data.
 * @param {Array} questions - Quiz questions
 * @returns {Object} Validation result
 */
export const validateQuizData = (questions) => {
  const errors = [];
  const warnings = [];

  if (!questions || questions.length === 0) {
    errors.push("No valid questions found");
    return { valid: false, errors, warnings };
  }

  questions.forEach((q, index) => {
    if (!q.question || String(q.question).trim() === "") {
      errors.push(`Question ${index + 1}: Missing question text`);
    }

    if (!q.options || q.options.length < 2) {
      errors.push(`Question ${index + 1}: Need at least 2 options`);
    }

    if (!q.answer || (Array.isArray(q.answer) ? q.answer.length === 0 : String(q.answer).trim() === "")) {
      warnings.push(`Question ${index + 1}: Missing correct answer`);
    }

    if (q.options) {
      q.options.forEach((opt, optIdx) => {
        if (isQuestionTypeText(opt)) {
          errors.push(`Question ${index + 1}, Option ${optIdx + 1}: Contains question type instead of answer`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalQuestions: questions.length,
  };
};
