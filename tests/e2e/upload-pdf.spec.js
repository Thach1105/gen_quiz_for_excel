import { test, expect } from "@playwright/test";
import {
  mockCreateQuiz,
  mockDocumentExtractDelayed,
  mockDocumentExtractSuccess,
  mockQuizApi,
} from "./helpers.js";

test.describe("PDF Import Flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "PDF" }).click();
  });

  test("shows preview after successful PDF extraction", async ({ page }) => {
    await mockDocumentExtractSuccess(page);

    await page.locator("input[type='file']").setInputFiles({
      name: "quiz-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock pdf"),
    });

    await expect(page.getByText("PDF question 1?")).toBeVisible();
    await expect(page.getByText("Phân tích PDF thành công! Kiểm tra preview bên dưới trước khi tạo quiz.")).toBeVisible();
  });

  test("shows loading popup and allows cancelling import", async ({ page }) => {
    await mockDocumentExtractDelayed(page, { delayMs: 5000 });

    await page.locator("input[type='file']").setInputFiles({
      name: "quiz-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock pdf"),
    });

    await expect(page.getByText("Đang phân tích tài liệu")).toBeVisible();
    await page.getByRole("button", { name: "Hủy" }).click();

    await expect(page.getByText("Đang phân tích tài liệu")).toHaveCount(0);
    await expect(page.getByText("Đã hủy import PDF.")).toBeVisible();
    await expect(page.getByText("PDF question 1?")).toHaveCount(0);
  });

  test("shows friendly popup for extraction errors and retries successfully", async ({ page }) => {
    let callCount = 0;

    await page.route("**/api/quiz/extract-from-document", async route => {
      callCount += 1;
      if (callCount === 1) {
        await route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ error: "quota exceeded" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            questions: [
              {
                id: 1,
                question: "Retry question?",
                options: ["A", "B", "C", "D"],
                answer: ["A"],
                type: "Single choice",
                explanation: "Retried successfully.",
              },
            ],
            validation: {
              valid: true,
              errors: [],
              warnings: [],
              totalQuestions: 1,
            },
            fileName: "quiz-document.pdf",
          },
        }),
      });
    });

    await page.locator("input[type='file']").setInputFiles({
      name: "quiz-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock pdf"),
    });

    await expect(page.getByText("AI đang bận xử lý")).toBeVisible();
    await page.getByRole("button", { name: "Thử lại" }).click();

    await expect(page.getByText("Retry question?")).toBeVisible();
    await expect.poll(() => callCount).toBe(2);
  });

  test("resets PDF preview so user can import again", async ({ page }) => {
    await mockDocumentExtractSuccess(page);

    await page.locator("input[type='file']").setInputFiles({
      name: "quiz-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock pdf"),
    });

    await expect(page.getByText("PDF question 1?")).toBeVisible();
    await page.getByRole("button", { name: "Xóa preview để làm lại" }).click();

    await expect(page.getByText("PDF question 1?")).toHaveCount(0);
    await expect(page.getByText("Chưa có câu hỏi")).toBeVisible();
  });

  test("keeps long PDF preview inside a fixed-height scroll area", async ({ page }) => {
    const questions = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      question: `Long PDF question ${index + 1}?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: ["Option A"],
      type: "Single choice",
      explanation: "Generated for long preview layout.",
    }));

    await page.route("**/api/quiz/extract-from-document", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            questions,
            validation: {
              valid: true,
              errors: [],
              warnings: [],
              totalQuestions: questions.length,
            },
            fileName: "long-quiz-document.pdf",
          },
        }),
      });
    });

    await page.locator("input[type='file']").setInputFiles({
      name: "long-quiz-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock pdf"),
    });

    const previewCard = page.locator("#preview");
    const previewList = previewCard.locator("[data-testid='preview-question-list']");

    await expect(page.getByText("Long PDF question 1?")).toBeVisible();
    await expect(page.getByText("Long PDF question 50?")).not.toBeInViewport();

    const dimensions = await page.evaluate(() => {
      const upload = document.querySelector("#upload");
      const preview = document.querySelector("#preview");
      const list = document.querySelector("[data-testid='preview-question-list']");
      return {
        uploadHeight: upload?.getBoundingClientRect().height || 0,
        previewHeight: preview?.getBoundingClientRect().height || 0,
        listClientHeight: list?.clientHeight || 0,
        listScrollHeight: list?.scrollHeight || 0,
      };
    });

    expect(dimensions.previewHeight).toBeGreaterThan(1000);
    expect(dimensions.previewHeight).toBeGreaterThanOrEqual(dimensions.uploadHeight - 80);
    expect(dimensions.listClientHeight).toBeLessThan(dimensions.previewHeight);
    expect(dimensions.listScrollHeight).toBeGreaterThan(dimensions.listClientHeight);

    await previewList.evaluate(node => {
      node.scrollTop = node.scrollHeight;
    });
    await expect(page.getByText("Long PDF question 50?")).toBeVisible();
  });

  test("creates quiz from PDF preview", async ({ page }) => {
    let createPayload;

    await mockDocumentExtractSuccess(page);
    await mockCreateQuiz(page, (payload) => {
      createPayload = payload;
    });

    await page.locator("input[type='file']").setInputFiles({
      name: "quiz-document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock pdf"),
    });

    await page.getByRole("button", { name: /Tạo bài quiz/i }).click();

    await expect.poll(() => createPayload?.description).toBe("Quiz được tạo từ file PDF bằng Gemini");
    expect(createPayload.questions).toHaveLength(2);
    expect(createPayload.questions[0].question).toBe("PDF question 1?");
  });
});
