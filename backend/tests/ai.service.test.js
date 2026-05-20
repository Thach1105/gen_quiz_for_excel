import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/pdf.service.js", () => ({
  extractTextFromPdfBuffer: vi.fn(async () => "Question 1?\nA. Option A\nB. Option B\nC. Option C\nD. Option D"),
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
const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("ai.service helpers", () => {
  it("buildPrompt includes formatting example and extracted document text", () => {
    const prompt = buildPrompt("Question 1?\nA. Option A\nB. Option B");

    expect(prompt).toContain("Example JSON item");
    expect(prompt).toContain("Thủ đô của Việt Nam là gì?");
    expect(prompt).toContain("The answer array must contain the exact option text values from options.");
    expect(prompt).toContain("Document text begins below:");
    expect(prompt).toContain("Question 1?");
  });

  it("detects question type labels in English and Vietnamese-like text", () => {
    expect(isQuestionTypeText("Single choice")).toBe(true);
    expect(isQuestionTypeText("Multiple choice")).toBe(true);
    expect(isQuestionTypeText("chon nhieu dap an")).toBe(true);
    expect(isQuestionTypeText("Đây là đáp án đúng")).toBe(false);
  });

  it("throws when AI api key is missing", async () => {
    process.env.AI_API_URL = "https://example.com/v1/chat/completions";
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    await expect(extractQuestionsFromDocument({
      buffer: Buffer.from("fake"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    })).rejects.toMatchObject({
      message: "Missing AI_API_KEY",
      statusCode: 500,
    });
  });

  it("extracts questions via configured AI endpoint", async () => {
    process.env.AI_API_URL = "https://example.com/v1/chat/completions";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "model-primary";
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                question: "Question 1?",
                options: ["Option A", "Option B", "Option C", "Option D"],
                answer: ["Option A"],
                type: "Single choice",
                explanation: "Because A is correct",
              },
            ]),
          },
        }],
      }),
    });

    const result = await extractQuestionsFromDocument({
      buffer: Buffer.from("fake-pdf"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("Document text begins below:"),
      }),
    );
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

  it("auto-appends chat completions endpoint for base /v1 urls", async () => {
    process.env.AI_API_URL = "http://103.160.2.147:20128/v1";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "kr/claude-sonnet-4.5";
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                question: "Base URL question?",
                options: ["A", "B", "C", "D"],
                answer: ["A"],
                type: "Single choice",
                explanation: "Resolved endpoint correctly",
              },
            ]),
          },
        }],
      }),
    });

    const result = await extractQuestionsFromDocument({
      buffer: Buffer.from("fake-pdf"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://103.160.2.147:20128/v1/chat/completions",
      expect.any(Object),
    );
    expect(result[0].question).toBe("Base URL question?");
  });

  it("parses SSE-style data responses from 9router", async () => {
    process.env.AI_API_URL = "http://103.160.2.147:20128/v1";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "kr/claude-sonnet-4.5";
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => [
        'data: {"id":"chatcmpl-1","choices":[{"message":{"content":"[{\\"question\\":\\"SSE question?\\",\\"options\\":[\\"A\\",\\"B\\",\\"C\\",\\"D\\"],\\"answer\\":[\\"C\\"],\\"type\\":\\"Single choice\\",\\"explanation\\":\\"Parsed from SSE\\"}]"}}]}',
        "data: [DONE]",
      ].join("\n"),
    });

    const result = await extractQuestionsFromDocument({
      buffer: Buffer.from("fake-pdf"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    });

    expect(result).toEqual([
      {
        id: 1,
        question: "SSE question?",
        options: ["A", "B", "C", "D"],
        answer: ["C"],
        type: "Single choice",
        explanation: "Parsed from SSE",
      },
    ]);
  });

  it("falls back to next model when provider returns retryable error", async () => {
    process.env.AI_API_URL = "https://example.com/v1/chat/completions";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "missing-model";
    process.env.AI_MODEL_FALLBACKS = "working-model";

    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: { message: "model not found", code: 404, status: "NOT_FOUND" } }),
        text: async () => JSON.stringify({ error: { message: "model not found", code: 404, status: "NOT_FOUND" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify([
                {
                  question: "Recovered question?",
                  options: ["A", "B", "C", "D"],
                  answer: ["B"],
                  type: "Single choice",
                  explanation: "Recovered by fallback",
                },
              ]),
            },
          }],
        }),
      });

    const result = await extractQuestionsFromDocument({
      buffer: Buffer.from("fake-pdf"),
      mimeType: "application/pdf",
      fileName: "sample.pdf",
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result[0].question).toBe("Recovered question?");
  });

  it("returns empty api key when AI_API_KEY is absent", () => {
    process.env.AI_API_URL = "https://example.com/v1/chat/completions";
    delete process.env.AI_API_KEY;

    const config = getAiConfig();

    expect(config.apiKey).toBe("");
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
    process.env.AI_PROVIDER = "generic";
    process.env.AI_API_URL = "https://example.com/v1/chat/completions";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_MODEL = "models/custom-primary";
    process.env.AI_MODEL_FALLBACKS = "models/custom-secondary, models/custom-primary, models/custom-tertiary";

    const config = getAiConfig();

    expect(config.provider).toBe("generic");
    expect(config.apiUrl).toBe("https://example.com/v1/chat/completions");
    expect(config.apiKey).toBe("test-key");
    expect(config.primaryModel).toBe("models/custom-primary");
    expect(config.models.slice(0, 3)).toEqual([
      "models/custom-primary",
      "models/custom-secondary",
      "models/custom-tertiary",
    ]);
    expect(new Set(config.models).size).toBe(config.models.length);
  });
});
