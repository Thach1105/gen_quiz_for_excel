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

const assertAiCredentials = (config) => {
  if (config.provider !== "gemini") {
    const error = new Error(`Unsupported AI_PROVIDER: ${config.provider}`);
    error.statusCode = 500;
    throw error;
  }

  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("Missing GEMINI_API_KEY");
    error.statusCode = 500;
    throw error;
  }
};

const getClient = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const isQuestionTypeText = (value) => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return /^(single|single choice)$/.test(normalized)
    || /^(multiple|multiple choice)$/.test(normalized)
    || /^multi(?:\s+choice)?$/.test(normalized)
    || /^checkbox(?:es)?$/.test(normalized)
    || /^chon\s+nhieu(?:\s+(?:dap\s+an|lua\s+chon))?$/.test(normalized)
    || /^nhieu\s+(?:dap\s+an|lua\s+chon)$/.test(normalized);
};;

export const normalizeQuestionType = (value, answers = []) => {
  if (value === "Multiple choice") return value;
  return answers.length > 1 ? "Multiple choice" : "Single choice";
};

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const normalizeText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/đ/g, "d")
  .replace(/Đ/g, "D")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();

const getOptionLabel = (value) => {
  const match = String(value || "").trim().match(/^([A-Z])[\s.)：:、-]+/i);
  return match ? match[1].toUpperCase() : null;
};

const stripOptionLabel = (value) => String(value || "")
  .trim()
  .replace(/^([A-Z])[\s.)：:、-]+/i, "")
  .replace(/\s+/g, " ")
  .trim();

const expandAnswerCandidates = (answer) => {
  const text = String(answer || "").trim();
  const normalized = normalizeText(text);
  const letterPart = normalized.replace(/^dap\s*an\s*[:：]?\s*/, "");

  if (/^[a-z](\s*(,|;|\/|\+|&|va|and)\s*[a-z])+$/.test(letterPart)) {
    return letterPart.match(/[a-z]/g).map(letter => letter.toUpperCase());
  }

  return [text];
};

const mapAnswerToOption = (answer, labelToOption, normalizedOptionToOption) => {
  const raw = String(answer || "").trim();
  if (!raw) return null;

  const normalized = normalizeText(raw).replace(/^dap\s*an\s*[:：]?\s*/, "").trim();

  if (/^[a-z]$/i.test(normalized)) {
    return labelToOption.get(normalized.toUpperCase()) || null;
  }

  const withoutLabel = stripOptionLabel(raw);
  return normalizedOptionToOption.get(normalizeText(raw))
    || normalizedOptionToOption.get(normalizeText(withoutLabel))
    || null;
};

export const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions)) {
    const error = new Error("AI response did not return a question list");
    error.statusCode = 502;
    throw error;
  }

  return questions.map((question, index) => {
    const rawOptions = Array.isArray(question?.options) ? question.options : [];
    const labelToOption = new Map();
    const normalizedOptionToOption = new Map();

    const options = rawOptions
      .map(option => String(option || "").trim())
      .filter(Boolean)
      .map((option, optionIndex) => {
        const explicitLabel = getOptionLabel(option);
        const cleanOption = stripOptionLabel(option);
        const label = explicitLabel || OPTION_LETTERS[optionIndex];

        if (label && cleanOption) labelToOption.set(label, cleanOption);
        if (cleanOption) normalizedOptionToOption.set(normalizeText(cleanOption), cleanOption);

        return cleanOption;
      })
      .filter(Boolean)
      .filter(option => !isQuestionTypeText(option));

    options.forEach((option, optionIndex) => {
      labelToOption.set(OPTION_LETTERS[optionIndex], option);
      normalizedOptionToOption.set(normalizeText(option), option);
    });

    const rawAnswers = Array.isArray(question?.answer) ? question.answer : [];
    const answer = rawAnswers
      .flatMap(expandAnswerCandidates)
      .map(candidate => mapAnswerToOption(candidate, labelToOption, normalizedOptionToOption))
      .filter(Boolean)
      .filter((item, itemIndex, list) => list.indexOf(item) === itemIndex);

    return {
      id: index + 1,
      question: String(question?.question || "").replace(/\s+/g, " ").trim(),
      options,
      answer,
      type: normalizeQuestionType(String(question?.type || "").trim(), answer),
      explanation: String(question?.explanation || "").trim(),
    };
  }).filter(question =>
    question.question
    && question.options.length >= 2
    && question.answer.length >= 1
  );
};

export const buildPrompt = () => [
  "Read the entire document carefully and extract as many quiz questions as possible into JSON.",
  "Your priority is completeness: do not stop early, do not summarize, and do not return only a sample.",
  "If the document contains around dozens of questions, return all valid questions you can find, in the same order as the source.",
  "Treat every numbered question, bullet question, or clearly separated question block as a candidate question.",
  "Only skip content that is clearly not a question or does not contain enough information to form at least two answer options.",
  "Do not merge multiple source questions into one JSON item and do not drop later questions just because earlier ones were extracted successfully.",
  "Use 'Single choice' when there is one correct answer and 'Multiple choice' when there are multiple correct answers.",
  "If the source provides no explanation, return an empty explanation string.",
  "The answer array must contain the exact option text values from options.",
  "If the source answer is a letter such as A, B, C, D, convert it to the full option text before returning JSON.",
  "If the source answer contains multiple letters such as A,C or A và C, return all corresponding full option texts in answer.",
  "Never put answer letters like A, B, C, D in the answer array unless the actual option text is exactly that letter.",
  "Only include a question when you can identify at least one correct answer.",
  "For combination options like 'I, II, III', treat A/B/C/D as option labels, not as multiple answers.",
  "Options must contain only answer texts and must never contain labels like 'Single choice', 'Multiple choice', 'True/False', question numbers, or instructions.",
  "Preserve mathematical symbols, medical terms, abbreviations, and answer text faithfully from the source.",
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
    return parsed?.error || parsed || null;
  } catch {
    return null;
  }
};

export const normalizeModelError = (error) => {
  const apiError = parseApiErrorPayload(error?.message);
  const statusCode = error?.statusCode || apiError?.code || apiError?.statusCode || null;
  const status = error?.status || apiError?.status || apiError?.type || null;
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
    || statusCode === 408
    || statusCode === 409
    || statusCode === 425
    || statusCode === 429
    || statusCode === 500
    || statusCode === 502
    || statusCode === 503
    || statusCode === 504
    || status === "RESOURCE_EXHAUSTED"
    || status === "INTERNAL"
    || status === "UNAVAILABLE"
    || message.includes("not found")
    || message.includes("model")
    || message.includes("overloaded")
    || message.includes("unavailable")
    || message.includes("quota")
    || message.includes("internal error")
    || message.includes("timeout");
};

export const generateWithModel = async ({ ai, model, buffer, mimeType }) => {
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
      temperature: 0,
      maxOutputTokens: 65536,
    },
  });
};

export const extractQuestionsFromDocument = async ({ buffer, mimeType, fileName }) => {
  const config = getAiConfig();
  assertAiCredentials(config);
  const ai = getClient();
  const failures = [];

  for (const model of config.models) {
    try {
      const response = await generateWithModel({
        ai,
        model,
        buffer,
        mimeType,
      });
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
