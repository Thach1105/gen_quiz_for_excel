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

      if (request.method() === "PUT") {
        const payload = request.postDataJSON();
        const id = url.split("/api/quiz/")[1];
        const quiz = listQuizzes.find(item => item.id === id) || listQuizzes[0];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              ...quiz,
              title: payload.title,
              settings: payload.settings || quiz.settings,
              updatedAt: "2026-05-03T08:00:00.000Z",
            },
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

  test("should rename quiz inline and allow canceling edits", async ({ page }) => {
    let renamePayload;

    await page.route("**/api/quiz/quiz-comma", async route => {
      if (route.request().method() === "PUT") {
        renamePayload = route.request().postDataJSON();
      }
      await route.fallback();
    });

    await page.goto("/quizzes");

    await page.getByTestId("rename-start-quiz-comma").click();
    await page.getByTestId("rename-input-quiz-comma").fill("Quiz đã đổi tên");
    await page.getByTestId("rename-save-quiz-comma").click();

    await expect.poll(() => renamePayload).toEqual({ title: "Quiz đã đổi tên" });
    await expect(page.getByText("Quiz đã đổi tên")).toBeVisible();

    await page.getByTestId("rename-start-quiz-comma").click();
    await page.getByTestId("rename-input-quiz-comma").fill("Tên không lưu");
    await page.getByTestId("rename-cancel-quiz-comma").click();

    await expect(page.getByText("Tên không lưu")).toHaveCount(0);
    await expect(page.getByText("Quiz đã đổi tên")).toBeVisible();
  });

  test("should update quiz time limit inline", async ({ page }) => {
    let updatePayload;

    await page.route("**/api/quiz/quiz-comma", async route => {
      if (route.request().method() === "PUT") {
        updatePayload = route.request().postDataJSON();
      }
      await route.fallback();
    });

    await page.goto("/quizzes");

    await page.getByTestId("time-start-quiz-comma").click();
    await page.getByTestId("time-input-quiz-comma").fill("40");
    await page.getByTestId("time-save-quiz-comma").click();

    await expect.poll(() => updatePayload?.settings?.timeLimit).toBe(40);
    await expect(page.getByTestId("time-start-quiz-comma")).toContainText("40");
  });
});
