import { test, expect } from "@playwright/test";
import { mockQuestions } from "./helpers.js";

const listQuizzes = [
  {
    id: "quiz-comma",
    title: "Quiz comma nâng cao",
    description: "Có câu hỏi nhiều đáp án và đáp án chứa dấu phẩy",
    questions: mockQuestions,
    settings: {
      timeLimit: 25,
      shuffle: true,
    },
    createdAt: "2026-05-01T08:00:00.000Z",
    updatedAt: "2026-05-02T08:00:00.000Z",
  },
  {
    id: "quiz-basic",
    title: "Quiz cơ bản",
    description: "Bộ câu hỏi ngắn để luyện nhanh",
    questions: mockQuestions.slice(0, 1),
    settings: {
      timeLimit: 10,
      shuffle: false,
    },
    createdAt: "2026-04-20T08:00:00.000Z",
    updatedAt: "2026-04-21T08:00:00.000Z",
  },
];

test.describe("Quiz List", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/quiz**", async route => {
      const request = route.request();
      const url = request.url();

      if (request.method() === "GET" && url.includes("/api/quiz?")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: listQuizzes,
            pagination: {
              limit: 100,
              offset: 0,
              total: listQuizzes.length,
            },
          }),
        });
        return;
      }

      if (request.method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Deleted",
          }),
        });
        return;
      }

      await route.fallback();
    });
  });

  test("should show dashboard, search quizzes and expand preview", async ({ page }) => {
    await page.goto("/quizzes");

    await expect(page.getByText("Không gian quản lý quiz")).toBeVisible();
    await expect(page.getByText("Quiz comma nâng cao")).toBeVisible();
    await expect(page.getByText("Quiz cơ bản")).toBeVisible();

    await page.getByPlaceholder("Tìm theo tên, mô tả hoặc nội dung câu hỏi").fill("comma");
    await expect(page.getByText("Quiz comma nâng cao")).toBeVisible();
    await expect(page.getByText("Quiz cơ bản")).toHaveCount(0);

    await page.getByRole("button", { name: /Xem nhanh/i }).click();
    await expect(page.getByText("Xem nhanh nội dung")).toBeVisible();
    await expect(page.getByText("Single choice sample question?")).toBeVisible();
  });
});
