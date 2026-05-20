import logger from "./logger.service.js";
import { extractTextFromPdfBuffer } from "./pdf.service.js";

const DEFAULT_PROVIDER = "generic";
const DEFAULT_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_PRIMARY_MODEL = "models/gemini-3.5-flash";
const DEFAULT_FALLBACK_MODELS = [
  "models/gemini-3.5-flash",
  "models/gemini-2.5-flash",
  "models/gemini-3.1-flash-lite",
  "models/gemini-2.5-flash-lite",
];

export const parseEnvList = (value) => String(value || "")
  .split(",")
  .map(item => item.trim())
  .filter(Boolean);

export const getAiConfig = () => {
  const provider = String(process.env.AI_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  const apiUrl = String(
    process.env.AI_API_URL || process.env.AI_BASE_URL || DEFAULT_API_URL,
  ).trim();
  const apiKey = String(process.env.AI_API_KEY || "").trim();
  const primaryModel = String(process.env.AI_MODEL || DEFAULT_PRIMARY_MODEL).trim();

  const configuredFallbacks = parseEnvList(process.env.AI_MODEL_FALLBACKS);

  const models = [primaryModel, ...configuredFallbacks, ...DEFAULT_FALLBACK_MODELS]
    .map(model => String(model || "").trim())
    .filter(Boolean)
    .filter((model, index, list) => list.indexOf(model) === index);

  return {
    provider,
    apiUrl,
    apiKey,
    primaryModel,
    models,
  };
};

const assertAiCredentials = (config) => {
  if (!config.apiKey) {
    const error = new Error("Missing AI_API_KEY");
    error.statusCode = 500;
    throw error;
  }

  if (!config.apiUrl) {
    const error = new Error("Missing AI_API_URL");
    error.statusCode = 500;
    throw error;
  }
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
    const error = new Error("AI response did not return a question list");
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

export const buildPrompt = (documentText) => [
  "The backend has already extracted plain text from an uploaded PDF document.",
  "Read the extracted document text carefully and extract as many quiz questions as possible into JSON.",
  "Your priority is completeness: do not stop early, do not summarize, and do not return only a sample.",
  "If the document contains around dozens of questions, return all valid questions you can find, in the same order as the source.",
  "Treat every numbered question, bullet question, or clearly separated question block as a candidate question.",
  "Only skip content that is clearly not a question or does not contain enough information to form at least two answer options.",
  "Do not merge multiple source questions into one JSON item and do not drop later questions just because earlier ones were extracted successfully.",
  "Use 'Single choice' when there is one correct answer and 'Multiple choice' when there are multiple correct answers.",
  "If the source provides no explanation, return an empty explanation string.",
  "The answer array must contain the exact option text values from options.",
  "Options must contain only answer texts and must never contain labels like 'Single choice', 'Multiple choice', 'True/False', question numbers, or instructions.",
  "Preserve mathematical symbols, medical terms, abbreviations, and answer text faithfully from the source.",
  "Return JSON only. The root value must be an array of question objects.",
  "Each question object must have exactly these keys: question, options, answer, type, explanation.",
  "The following example is only a formatting example. Do not copy its content unless it actually appears in the document.",
  `Example JSON item: ${JSON.stringify({
    question: "Thủ đô của Việt Nam là gì?",
    options: ["Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ"],
    answer: ["Hà Nội"],
    type: "Single choice",
    explanation: "Hà Nội là thủ đô của Việt Nam.",
  })}`,
  "Document text begins below:",
  documentText,
].join("\n\n");

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

const buildInteractionsRequestBody = ({ model, prompt }) => ({
  model,
  input: [
    { type: "text", text: prompt },
  ],
});

const buildChatCompletionsRequestBody = ({ model, prompt }) => ({
  model,
  stream: false,
  response_format: { type: "json_object" },
  messages: [
    {
      role: "user",
      content: prompt,
    },
  ],
});

const resolveApiEndpoint = (apiUrl) => {
  const normalizedUrl = String(apiUrl || "").trim().replace(/\/+$/, "");

  if (!normalizedUrl) return "";
  if (normalizedUrl.endsWith("/chat/completions") || normalizedUrl.endsWith("/interactions")) {
    return normalizedUrl;
  }
  if (normalizedUrl.endsWith("/v1") || normalizedUrl.endsWith("/v1beta/openai")) {
    return `${normalizedUrl}/chat/completions`;
  }
  return `${normalizedUrl}/interactions`;
};

const buildRequestBody = ({ apiUrl, model, prompt }) => {
  const endpoint = resolveApiEndpoint(apiUrl);

  if (endpoint.endsWith("/chat/completions")) {
    return buildChatCompletionsRequestBody({ model, prompt });
  }

  return buildInteractionsRequestBody({ model, prompt });
};

const parseSsePayload = (rawText) => {
  const dataChunks = String(rawText || "")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice(5).trim())
    .filter(chunk => chunk && chunk !== "[DONE]");

  if (dataChunks.length === 0) return null;

  const parsedPayloads = dataChunks
    .map(chunk => {
      try {
        return JSON.parse(chunk);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return parsedPayloads.length > 0 ? parsedPayloads[parsedPayloads.length - 1] : null;
};

const parseAiResponsePayload = (rawText) => {
  try {
    return JSON.parse(String(rawText || ""));
  } catch {
    return parseSsePayload(rawText);
  }
};

const extractTextFromAiResponse = (payload) => {
  if (typeof payload?.choices?.[0]?.message?.content === "string") {
    return payload.choices[0].message.content;
  }

  if (Array.isArray(payload?.choices?.[0]?.message?.content)) {
    return payload.choices[0].message.content
      .map(part => part?.text || part?.content || "")
      .filter(Boolean)
      .join("\n");
  }

  if (typeof payload?.choices?.[0]?.delta?.content === "string") {
    return payload.choices[0].delta.content;
  }

  if (Array.isArray(payload?.steps)) {
    const stepTexts = payload.steps
      .flatMap(step => Array.isArray(step?.content) ? step.content : [])
      .map(part => part?.text || "")
      .filter(Boolean);

    if (stepTexts.length > 0) return stepTexts.join("\n");
  }

  if (typeof payload?.text === "string") {
    return payload.text;
  }

  return "";
};

const createHttpError = async (response) => {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    try {
      const text = await response.text();
      payload = text ? { error: { message: text } } : null;
    } catch {
      payload = null;
    }
  }

  const message = payload?.error?.message
    || payload?.message
    || `AI request failed with status ${response.status}`;

  const error = new Error(typeof payload === "string" ? payload : JSON.stringify(payload || { error: { message } }));
  error.statusCode = response.status;
  error.status = payload?.error?.status || payload?.error?.type || response.statusText;
  throw error;
};

export const generateWithModel = async ({ apiUrl, apiKey, model, prompt }) => {
  const endpoint = resolveApiEndpoint(apiUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody({ apiUrl, model, prompt })),
  });

  if (!response.ok) {
    await createHttpError(response);
  }

  const responseText = await response.text();
  const payload = parseAiResponsePayload(responseText);

  if (!payload) {
    const error = new Error(`AI provider returned an unreadable response: ${responseText.slice(0, 300)}`);
    error.statusCode = 502;
    throw error;
  }

  const rawText = extractTextFromAiResponse(payload);

  if (!rawText) {
    const error = new Error("AI provider returned an empty response");
    error.statusCode = 502;
    throw error;
  }

  return rawText;
};

export const extractQuestionsFromDocument = async ({ buffer, mimeType, fileName }) => {
  const config = getAiConfig();
  assertAiCredentials(config);
  const documentText = await extractTextFromPdfBuffer(buffer);
  const prompt = buildPrompt(documentText);
  const failures = [];

  for (const model of config.models) {
    try {
      const rawText = await generateWithModel({
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        model,
        prompt,
      });
      const parsed = JSON.parse(rawText);
      const questions = normalizeQuestions(parsed);

      logger.info("Document converted to quiz questions", {
        fileName,
        questionCount: questions.length,
        mimeType,
        provider: config.provider,
        apiUrl: config.apiUrl,
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
        apiUrl: config.apiUrl,
        model,
        statusCode: normalizedError.statusCode,
        status: normalizedError.status,
        error: normalizedError.message,
      });

      if (!shouldTryNextModel(normalizedError)) {
        logger.error("AI document extraction failed", {
          fileName,
          mimeType,
          provider: config.provider,
          apiUrl: config.apiUrl,
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
    apiUrl: config.apiUrl,
    attempts: failures,
  });

  throw error;
};
