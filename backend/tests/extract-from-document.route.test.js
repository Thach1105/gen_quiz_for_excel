import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockExtractQuestionsFromDocument, mockGetDB } = vi.hoisted(() => ({
  mockExtractQuestionsFromDocument: vi.fn(),
  mockGetDB: vi.fn(),
}));

vi.mock("../src/services/gemini.service.js", async () => {
  const actual = await vi.importActual("../src/services/gemini.service.js");
  return {
    ...actual,
    extractQuestionsFromDocument: mockExtractQuestionsFromDocument,
  };
});

vi.mock("../src/services/mongodb.service.js", () => ({
  getDB: mockGetDB,
}));

import quizRoutes from "../src/routes/quiz.routes.js";
import { errorHandler } from "../src/middleware/error.middleware.js";

describe("POST /api/quiz/extract-from-document", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use("/api/quiz", quizRoutes);
    app.use(errorHandler);
    mockExtractQuestionsFromDocument.mockReset();
    mockGetDB.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when no file is uploaded", async () => {
    const response = await request(app)
      .post("/api/quiz/extract-from-document");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No file uploaded" });
  });

  it("returns 400 for invalid non-pdf file", async () => {
    const response = await request(app)
      .post("/api/quiz/extract-from-document")
      .attach("file", Buffer.from("bad"), "not-pdf.txt");

    expect(response.status).toBe(500);
    expect(response.body.error).toContain("Only PDF files");
  });

  it("returns 400 when extracted questions are empty", async () => {
    mockExtractQuestionsFromDocument.mockResolvedValue([]);

    const response = await request(app)
      .post("/api/quiz/extract-from-document")
      .attach("file", Buffer.from("fake-pdf"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No questions extracted from document" });
  });

  it("returns 200 with extracted questions when service succeeds", async () => {
    const questions = [
      {
        id: 1,
        question: "Thủ đô của Việt Nam là gì?",
        options: ["Hà Nội", "Huế", "Đà Nẵng", "Cần Thơ"],
        answer: ["Hà Nội"],
        type: "Single choice",
        explanation: "Hà Nội là thủ đô.",
      },
    ];
    mockExtractQuestionsFromDocument.mockResolvedValue(questions);

    const response = await request(app)
      .post("/api/quiz/extract-from-document")
      .attach("file", Buffer.from("fake-pdf"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.fileName).toBe("sample.pdf");
    expect(response.body.data.questions).toEqual(questions);
    expect(response.body.data.validation.valid).toBe(true);
  });

  it("preserves statusCode from service errors", async () => {
    const error = new Error("Quota exceeded");
    error.statusCode = 429;
    mockExtractQuestionsFromDocument.mockRejectedValue(error);

    const response = await request(app)
      .post("/api/quiz/extract-from-document")
      .attach("file", Buffer.from("fake-pdf"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({ error: "Quota exceeded" });
  });

  it("returns 400 when extracted quiz data fails validation", async () => {
    mockExtractQuestionsFromDocument.mockResolvedValue([
      {
        id: 1,
        question: "Câu lỗi",
        options: ["Only one option"],
        answer: ["Only one option"],
        type: "Single choice",
        explanation: "",
      },
    ]);

    const response = await request(app)
      .post("/api/quiz/extract-from-document")
      .attach("file", Buffer.from("fake-pdf"), {
        filename: "sample.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid quiz data");
    expect(Array.isArray(response.body.details)).toBe(true);
  });
});
