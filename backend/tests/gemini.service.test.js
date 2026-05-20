import { afterEach, describe, expect, it } from "vitest";
import {
  buildPrompt,
  getAiConfig,
  isQuestionTypeText,
  normalizeModelError,
  normalizeQuestions,
  normalizeQuestionType,
  parseApiErrorPayload,
  shouldTryNextModel,
} from "../src/services/gemini.service.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("gemini.service helpers", () => {
  it("buildPrompt includes formatting example and answer constraints", () => {
    const prompt = buildPrompt();

    expect(prompt).toContain("Example JSON item");
    expect(prompt).toContain("Thủ đô của Việt Nam là gì?");
    expect(prompt).toContain("The answer array must contain the exact option text values from options.");
    expect(prompt).toContain("Options must contain only answer texts");
  });

  it("detects question type labels in English and Vietnamese-like text", () => {
    expect(isQuestionTypeText("Single choice")).toBe(true);
    expect(isQuestionTypeText("Multiple choice")).toBe(true);
    expect(isQuestionTypeText("chon nhieu dap an")).toBe(true);
    expect(isQuestionTypeText("Đây là đáp án đúng")).toBe(false);
  });

  it("normalizes questions and removes invalid options and answers", () => {
    const result = normalizeQuestions([
      {
        question: "Câu hỏi 1?",
        options: ["Single choice", "Đáp án A", "Đáp án B", ""],
        answer: ["Single choice", "Đáp án B"],
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

  it("derives multiple choice from answer count when needed", () => {
    expect(normalizeQuestionType("", ["A", "B"])) .toBe("Multiple choice");
    expect(normalizeQuestionType("", ["A"])) .toBe("Single choice");
    expect(normalizeQuestionType("Multiple choice", ["A"])) .toBe("Multiple choice");
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

  it("builds AI config from env and de-duplicates models", () => {
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
