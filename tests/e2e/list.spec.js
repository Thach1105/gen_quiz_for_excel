import { test, expect } from "@playwright/test";
import { mockCategories, mockQuestions } from "./helpers.js";

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
    categoryId: "cat-tablet",
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
    categoryId: null,
    updatedAt: "2026-04-21T08:00:00.000Z",
  },
];

test.describe("Quiz List", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/quiz**", async route => {
      const request = route.request();
      const url = request.url();

      if (request.method() === "GET" && url.includes("/api/quiz/categories")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: mockCategories }),
        });
        return;
      }

      if (request.method() === "POST" && url.includes("/api/quiz/categories")) {
        const payload = request.postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "cat-new", name: payload.name, parentId: payload.parentId || null },
          }),
        });
        return;
      }

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
              title: payload.title || quiz.title,
              categoryId: Object.prototype.hasOwnProperty.call(payload, "categoryId") ? payload.categoryId : quiz.categoryId,
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
    await expect(page.getByRole("heading", { name: "Quiz comma nâng cao" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toBeVisible();

    await page.getByPlaceholder("Tìm theo tên, mô tả, nhóm phân loại hoặc nội dung câu hỏi").fill("comma");
    await expect(page.getByRole("heading", { name: "Quiz comma nâng cao" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toHaveCount(0);

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
    await expect(page.getByRole("heading", { name: "Quiz đã đổi tên" })).toBeVisible();

    await page.getByTestId("rename-start-quiz-comma").click();
    await page.getByTestId("rename-input-quiz-comma").fill("Tên không lưu");
    await page.getByTestId("rename-cancel-quiz-comma").click();

    await expect(page.getByText("Tên không lưu")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Quiz đã đổi tên" })).toBeVisible();
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

  test("should show category tree, filter and update quiz category", async ({ page }) => {
    let updatePayload;

    await page.route("**/api/quiz/quiz-basic", async route => {
      if (route.request().method() === "PUT") {
        updatePayload = route.request().postDataJSON();
      }
      await route.fallback();
    });

    await page.goto("/quizzes");

    await expect(page.getByText("Cây phân loại")).toBeVisible();
    await expect(page.getByRole("button", { name: /Dược lý 0 quiz/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Viên nén 1 quiz/i })).toBeVisible();

    await page.getByRole("button", { name: /Dược lý 0 quiz/i }).click();
    await expect(page.getByRole("heading", { name: "Quiz comma nâng cao" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toHaveCount(0);

    await page.getByRole("button", { name: "Tất cả" }).click();
    await page.getByTestId("quiz-category-select-quiz-basic").selectOption("cat-tablet");

    await expect.poll(() => updatePayload?.categoryId).toBe("cat-tablet");
  });

  test("should create category from category tree panel", async ({ page }) => {
    await page.goto("/quizzes");

    await page.getByTestId("new-category-name").fill("Tá dược");
    await page.getByTestId("new-category-parent").selectOption("cat-tablet");
    await page.getByTestId("create-category-button").click();

    await expect(page.getByRole("button", { name: /Tá dược 0 quiz/i })).toBeVisible();
  });
});
