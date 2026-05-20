import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { generateContentMock, googleGenAIConstructorMock } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const GoogleGenAI = vi.fn(function () {
    this.models = {
      generateContent,
    };
  });
  return {
    generateContentMock: generateContent,
    googleGenAIConstructorMock: GoogleGenAI,
  };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: googleGenAIConstructorMock,
  Type: {
    ARRAY: "ARRAY",
    OBJECT: "OBJECT",
    STRING: "STRING",
  },
  createPartFromText: vi.fn(text => ({ type: "text", text })),
  createUserContent: vi.fn(parts => parts),
}));

import {
  buildPrompt,
  getAiConfig,
  isQuestionTypeText,
  normalizeModelError,
  normalizeQuestions,
  normalizeQuestionType,
  parseApiErrorPayload,
  shouldTryNextModel,
  extractQuestionsFromDocument,
} from "../src/services/ai.service.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  generateContentMock.mockReset();
  googleGenAIConstructorMock.mockClear();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("ai.service helpers", () => {
  it("buildPrompt includes the Gemini extraction instructions and formatting example", () => {
    const prompt = buildPrompt();

    expect(prompt).toContain("Example JSON item");
    expect(prompt).toContain("Thủ đô của Việt Nam là gì?");
    expect(prompt).toContain("The answer array must contain the exact option text values from options.");
    expect(prompt).toContain("Read the entire document carefully");
  });

  it("detects question type labels in English and Vietnamese-like text", () => {
    expect(isQuestionTypeText("Single choice")).toBe(true);
    expect(isQuestionTypeText("Multiple choice")).toBe(true);
    expect(isQuestionTypeText("chon nhieu dap an")).toBe(true);
    expect(isQuestionTypeText("Đây là đáp án đúng")).toBe(false);
  });

  it("throws when Gemini api key is missing", async () => {
    process.env.AI_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;

    await expect(extractQuestionsFromDocument({
      buffer: Buffer.from("fake"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    })).rejects.toMatchObject({
      message: "Missing GEMINI_API_KEY",
      statusCode: 500,
    });
  });

  it("extracts questions via Gemini inline PDF input", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_MODEL = "models/gemini-test";
    generateContentMock.mockResolvedValue({
      text: JSON.stringify([
        {
          question: "Question 1?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: ["Option A"],
          type: "Single choice",
          explanation: "Because A is correct",
        },
      ]),
    });

    const result = await extractQuestionsFromDocument({
      buffer: Buffer.from("fake-pdf"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    });

    expect(googleGenAIConstructorMock).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    expect(generateContentMock).toHaveBeenCalledWith(expect.objectContaining({
      model: "models/gemini-test",
      contents: expect.arrayContaining([
        expect.objectContaining({
          inlineData: {
            mimeType: "application/pdf",
            data: Buffer.from("fake-pdf").toString("base64"),
          },
        }),
        expect.objectContaining({ type: "text" }),
      ]),
      config: expect.objectContaining({
        responseMimeType: "application/json",
        temperature: 0,
        maxOutputTokens: 65536,
      }),
    }));
    expect(result).toEqual([
      {
        id: 1,
        question: "Question 1?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: ["Option A"],
        type: "Single choice",
        explanation: "Because A is correct",
      },
    ]);
  });

  it("falls back to next Gemini model when provider returns retryable error", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_MODEL = "models/missing-model";
    process.env.AI_MODEL_FALLBACKS = "models/working-model";

    const retryableError = new Error('{"error":{"code":404,"status":"NOT_FOUND","message":"model not found"}}');
    generateContentMock
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValueOnce({
        text: JSON.stringify([
          {
            question: "Recovered question?",
            options: ["A", "B", "C", "D"],
            answer: ["B"],
            type: "Single choice",
            explanation: "Recovered by fallback",
          },
        ]),
      });

    const result = await extractQuestionsFromDocument({
      buffer: Buffer.from("fake-pdf"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    });

    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock.mock.calls[0][0].model).toBe("models/missing-model");
    expect(generateContentMock.mock.calls[1][0].model).toBe("models/working-model");
    expect(result[0].question).toBe("Recovered question?");
  });

  it("rejects unsupported providers", async () => {
    process.env.AI_PROVIDER = "generic";
    process.env.GEMINI_API_KEY = "test-key";

    await expect(extractQuestionsFromDocument({
      buffer: Buffer.from("fake"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    })).rejects.toMatchObject({
      message: "Unsupported AI_PROVIDER: generic",
      statusCode: 500,
    });
  });

  it("normalizes questions and removes invalid options and answers", () => {
    const result = normalizeQuestions([
      {
        question: "Câu hỏi 1?",
        options: ["Single choice", "Đáp án A", "Đáp án B", ""],
        answer: ["Đáp án B"],
        type: "Single choice",
        explanation: "Giải thích 1",
      },
      {
        question: "Câu hỏi 2?",
        options: ["Đáp án A"],
        answer: ["Đáp án A"],
        type: "Single choice",
        explanation: "Sẽ bị loại vì không đủ options",
      },
    ]);

    expect(result).toEqual([
      {
        id: 1,
        question: "Câu hỏi 1?",
        options: ["Đáp án A", "Đáp án B"],
        answer: ["Đáp án B"],
        type: "Single choice",
        explanation: "Giải thích 1",
      },
    ]);
  });

  it("maps answer letters to full option text", () => {
    const result = normalizeQuestions([
      {
        question: "Câu 12?",
        options: [
          "A. Dạng thuốc thứ nhất",
          "B. Đóng nhiều dạng thuốc vào cùng nang cứng",
          "C. Dạng thuốc thứ ba",
          "D. Dạng thuốc thứ tư",
        ],
        answer: ["B"],
        type: "Single choice",
        explanation: "",
      },
    ]);

    expect(result).toEqual([
      {
        id: 1,
        question: "Câu 12?",
        options: [
          "Dạng thuốc thứ nhất",
          "Đóng nhiều dạng thuốc vào cùng nang cứng",
          "Dạng thuốc thứ ba",
          "Dạng thuốc thứ tư",
        ],
        answer: ["Đóng nhiều dạng thuốc vào cùng nang cứng"],
        type: "Single choice",
        explanation: "",
      },
    ]);
  });

  it("maps Vietnamese answer labels to full option text", () => {
    const result = normalizeQuestions([
      {
        question: "Câu hỏi có đáp án nhãn?",
        options: ["A) Lựa chọn một", "B) Lựa chọn hai", "C) Lựa chọn ba", "D) Lựa chọn bốn"],
        answer: ["Đáp án: B"],
        type: "Single choice",
        explanation: "",
      },
    ]);

    expect(result[0].answer).toEqual(["Lựa chọn hai"]);
  });

  it("maps multiple answer letters and derives multiple choice", () => {
    const result = normalizeQuestions([
      {
        question: "Chọn nhiều đáp án đúng?",
        options: ["A. Ý một", "B. Ý hai", "C. Ý ba", "D. Ý bốn"],
        answer: ["A,C"],
        type: "Single choice",
        explanation: "",
      },
    ]);

    expect(result[0].answer).toEqual(["Ý một", "Ý ba"]);
    expect(result[0].type).toBe("Multiple choice");
  });

  it("drops questions without a valid mapped answer", () => {
    const result = normalizeQuestions([
      {
        question: "Không có đáp án hợp lệ?",
        options: ["A. Ý một", "B. Ý hai"],
        answer: ["Z"],
        type: "Single choice",
        explanation: "",
      },
    ]);

    expect(result).toEqual([]);
  });

  it("derives multiple choice from answer count when needed", () => {
    expect(normalizeQuestionType("", ["A", "B"])).toBe("Multiple choice");
    expect(normalizeQuestionType("", ["A"])).toBe("Single choice");
    expect(normalizeQuestionType("Multiple choice", ["A"])).toBe("Multiple choice");
  });

  it("parses embedded API error payloads", () => {
    expect(parseApiErrorPayload('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"quota hit"}}')).toEqual({
      code: 429,
      status: "RESOURCE_EXHAUSTED",
      message: "quota hit",
    });
    expect(parseApiErrorPayload("not json")).toBeNull();
  });

  it("normalizes model errors from raw Error and embedded JSON payload", () => {
    const error = new Error('{"error":{"code":503,"status":"UNAVAILABLE","message":"backend down"}}');
    const normalized = normalizeModelError(error);

    expect(normalized.statusCode).toBe(503);
    expect(normalized.status).toBe("UNAVAILABLE");
    expect(normalized.message).toBe("backend down");
  });

  it("decides when to retry the next model", () => {
    expect(shouldTryNextModel({ statusCode: 404, status: null, message: "not found" })).toBe(true);
    expect(shouldTryNextModel({ statusCode: 429, status: "RESOURCE_EXHAUSTED", message: "quota exceeded" })).toBe(true);
    expect(shouldTryNextModel({ statusCode: 400, status: "INVALID_ARGUMENT", message: "bad prompt" })).toBe(false);
  });

  it("builds Gemini config from env and de-duplicates models", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.AI_MODEL = "models/custom-primary";
    process.env.AI_MODEL_FALLBACKS = "models/custom-secondary, models/custom-primary, models/custom-tertiary";

    const config = getAiConfig();

    expect(config.provider).toBe("gemini");
    expect(config.primaryModel).toBe("models/custom-primary");
    expect(config.models.slice(0, 3)).toEqual([
      "models/custom-primary",
      "models/custom-secondary",
      "models/custom-tertiary",
    ]);
    expect(new Set(config.models).size).toBe(config.models.length);
  });
});
