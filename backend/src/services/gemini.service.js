import { GoogleGenAI, Type, createPartFromText, createUserContent } from "@google/genai";
import logger from "./logger.service.js";

const DEFAULT_PROVIDER = "gemini";
const DEFAULT_PRIMARY_MODEL = "models/gemini-3.5-flash";
const DEFAULT_FALLBACK_MODELS = [
  "models/gemini-3.5-flash",
  "models/gemini-2.5-flash",
  "models/gemini-3.1-flash-lite",
  "models/gemini-2.5-flash-lite",
];

const questionSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      answer: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      type: {
        type: Type.STRING,
        enum: ["Single choice", "Multiple choice"],
      },
      explanation: { type: Type.STRING },
    },
    required: ["question", "options", "answer", "type", "explanation"],
    propertyOrdering: ["question", "options", "answer", "type", "explanation"],
  },
};

export const parseEnvList = (value) => String(value || "")
  .split(",")
  .map(item => item.trim())
  .filter(Boolean);

export const getAiConfig = () => {
  const provider = String(process.env.AI_PROVIDER || process.env.GEMINI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  const primaryModel = String(
    process.env.AI_MODEL || process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL,
  ).trim();

  const configuredFallbacks = parseEnvList(
    process.env.AI_MODEL_FALLBACKS || process.env.GEMINI_MODEL_FALLBACKS,
  );

  const models = [primaryModel, ...configuredFallbacks, ...DEFAULT_FALLBACK_MODELS]
    .map(model => String(model || "").trim())
    .filter(Boolean)
    .filter((model, index, list) => list.indexOf(model) === index);

  return {
    provider,
    primaryModel,
    models,
  };
};

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("Missing GEMINI_API_KEY");
    error.statusCode = 500;
    throw error;
  }

  return new GoogleGenAI({ apiKey });
};

export const isQuestionTypeText = (value) => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

  return /\bsingle\b/.test(normalized)
    || /\bmultiple\b/.test(normalized)
    || /\bmulti(?:\s+choice)?\b/.test(normalized)
    || /\bcheckbox(?:es)?\b/.test(normalized)
    || /\bchon\s+nhieu\b/.test(normalized)
    || /\bnhieu(?:\s+(?:dap\s+an|lua\s+chon))?\b/.test(normalized);
};

export const normalizeQuestionType = (value, answers = []) => {
  if (value === "Multiple choice") return value;
  return answers.length > 1 ? "Multiple choice" : "Single choice";
};

export const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions)) {
    const error = new Error("Gemini did not return a question list");
    error.statusCode = 502;
    throw error;
  }

  return questions.map((question, index) => {
    const options = Array.isArray(question?.options)
      ? question.options
          .map(option => String(option || "").trim())
          .filter(Boolean)
          .filter(option => !isQuestionTypeText(option))
      : [];

    const answer = Array.isArray(question?.answer)
      ? question.answer
          .map(option => String(option || "").trim())
          .filter(Boolean)
          .filter(option => options.includes(option))
      : [];

    return {
      id: index + 1,
      question: String(question?.question || "").trim(),
      options,
      answer,
      type: normalizeQuestionType(String(question?.type || "").trim(), answer),
      explanation: String(question?.explanation || "").trim(),
    };
  }).filter(question => question.question && question.options.length >= 2);
};

export const buildPrompt = () => [
  "Read this document and extract quiz questions into JSON.",
  "Return only questions that clearly have a question statement and at least two answer options.",
  "Use 'Single choice' when there is one correct answer and 'Multiple choice' when there are multiple correct answers.",
  "If the source provides no explanation, return an empty explanation string.",
  "The answer array must contain the exact option text values from options.",
  "Options must contain only answer texts and must never contain labels like 'Single choice', 'Multiple choice', 'True/False', or instructions.",
  "The following example is only a formatting example. Do not copy its content unless it actually appears in the document.",
  `Example JSON item: ${JSON.stringify({
    question: "Thủ đô của Việt Nam là gì?",
    options: ["Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ"],
    answer: ["Hà Nội"],
    type: "Single choice",
    explanation: "Hà Nội là thủ đô của Việt Nam.",
  })}`,
].join(" ");

export const parseApiErrorPayload = (message) => {
  try {
    const parsed = JSON.parse(String(message || ""));
    return parsed?.error || null;
  } catch {
    return null;
  }
};

export const normalizeModelError = (error) => {
  const apiError = parseApiErrorPayload(error?.message);
  const statusCode = error?.statusCode || apiError?.code || null;
  const status = error?.status || apiError?.status || null;
  const message = apiError?.message || error?.message || "Unknown error";

  return {
    original: error,
    statusCode,
    status,
    message,
  };
};

export const shouldTryNextModel = (normalizedError) => {
  const message = String(normalizedError?.message || "").toLowerCase();
  const statusCode = normalizedError?.statusCode;
  const status = String(normalizedError?.status || "").toUpperCase();

  return statusCode === 404
    || statusCode === 429
    || statusCode === 500
    || statusCode === 502
    || statusCode === 503
    || status === "RESOURCE_EXHAUSTED"
    || status === "INTERNAL"
    || message.includes("not found")
    || message.includes("model")
    || message.includes("overloaded")
    || message.includes("unavailable")
    || message.includes("quota")
    || message.includes("internal error");
};

const generateWithModel = async ({ ai, model, buffer, mimeType }) => {
  return ai.models.generateContent({
    model,
    contents: createUserContent([
      {
        inlineData: {
          mimeType,
          data: buffer.toString("base64"),
        },
      },
      createPartFromText(buildPrompt()),
    ]),
    config: {
      responseMimeType: "application/json",
      responseSchema: questionSchema,
    },
  });
};

export const extractQuestionsFromDocument = async ({ buffer, mimeType, fileName }) => {
  const config = getAiConfig();
  if (config.provider !== "gemini") {
    const error = new Error(`Unsupported AI_PROVIDER: ${config.provider}`);
    error.statusCode = 500;
    throw error;
  }

  const ai = getClient();
  const failures = [];

  for (const model of config.models) {
    try {
      const response = await generateWithModel({ ai, model, buffer, mimeType });
      const rawText = response.text;

      if (!rawText) {
        const error = new Error("Gemini returned an empty response");
        error.statusCode = 502;
        throw error;
      }

      const parsed = JSON.parse(rawText);
      const questions = normalizeQuestions(parsed);

      logger.info("Document converted to quiz questions", {
        fileName,
        questionCount: questions.length,
        mimeType,
        provider: config.provider,
        model,
      });

      return questions;
    } catch (error) {
      const normalizedError = normalizeModelError(error);

      failures.push({
        model,
        statusCode: normalizedError.statusCode,
        status: normalizedError.status,
        message: normalizedError.message,
      });

      logger.warn("AI model attempt failed", {
        fileName,
        mimeType,
        provider: config.provider,
        model,
        statusCode: normalizedError.statusCode,
        status: normalizedError.status,
        error: normalizedError.message,
      });

      if (!shouldTryNextModel(normalizedError)) {
        logger.error("Gemini document extraction failed", {
          fileName,
          mimeType,
          provider: config.provider,
          model,
          attempts: failures,
          error: normalizedError.message,
          stack: error.stack,
        });

        error.statusCode = normalizedError.statusCode || error.statusCode || 500;
        error.message = normalizedError.message;
        throw error;
      }
    }
  }

  const error = new Error(`All configured AI models failed: ${config.models.join(", ")}`);
  error.statusCode = 502;

  logger.error("All AI model attempts failed", {
    fileName,
    mimeType,
    provider: config.provider,
    attempts: failures,
  });

  throw error;
};
