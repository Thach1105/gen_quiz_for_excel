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

const normalizeSearchText = value => String(value || "")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/đ/g, "d")
  .replace(/Đ/g, "D")
  .toLowerCase();

const getCategoryPath = categoryId => {
  if (!categoryId) return "Chưa phân loại";
  const categoryMap = new Map(mockCategories.map(category => [category.id, category]));
  const category = categoryMap.get(categoryId);
  if (!category) return "Chưa phân loại";
  const path = [category.name];
  let parent = categoryMap.get(category.parentId);
  while (parent) {
    path.unshift(parent.name);
    parent = categoryMap.get(parent.parentId);
  }
  return path.join(" ");
};

const getDescendantCategoryIds = categoryId => {
  const ids = [categoryId];
  mockCategories
    .filter(category => category.parentId === categoryId)
    .forEach(category => ids.push(...getDescendantCategoryIds(category.id)));
  return ids;
};

const filterListQuizzes = url => {
  const parsedUrl = new URL(url);
  const searchTokens = normalizeSearchText(parsedUrl.searchParams.get("search") || "")
    .split(/\s+/)
    .filter(Boolean);
  const categoryId = parsedUrl.searchParams.get("categoryId") || "all";
  const sortBy = parsedUrl.searchParams.get("sortBy") || "latest";

  return listQuizzes
    .filter(quiz => {
      if (categoryId === "uncategorized" && quiz.categoryId) return false;
      if (categoryId !== "all" && categoryId !== "uncategorized" && !getDescendantCategoryIds(categoryId).includes(quiz.categoryId)) return false;

      const text = normalizeSearchText([
        quiz.title,
        quiz.description,
        getCategoryPath(quiz.categoryId),
      ].join(" "));
      return searchTokens.every(token => text.split(/\s+/).some(word => word.includes(token)));
    })
    .sort((a, b) => {
      if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""), "vi");
      if (sortBy === "questions") return (b.questions?.length || 0) - (a.questions?.length || 0);
      if (sortBy === "time") return (b.settings?.timeLimit || 0) - (a.settings?.timeLimit || 0);
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
};

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
        const data = filterListQuizzes(url);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data,
            pagination: {
              limit: 100,
              offset: 0,
              total: data.length,
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

    await expect(page.getByRole("heading", { name: "Danh sách Quiz" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quiz comma nâng cao" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toBeVisible();

    await page.getByPlaceholder("Tìm theo tên, mô tả, nhóm phân loại hoặc nội dung câu hỏi").fill("duoc nen");
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toBeVisible();
    await page.getByRole("button", { name: "Tìm kiếm" }).click();
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
    await expect(page.getByTestId("category-node-cat-pharma")).toContainText("Dược lý");
    await expect(page.getByTestId("category-node-cat-tablet")).toHaveCount(0);

    await page.getByRole("button", { name: "Mở nhóm" }).click();
    await expect(page.getByTestId("category-node-cat-tablet")).toContainText("Viên nén");

    await page.getByTestId("category-node-cat-pharma").getByText("Dược lý").click();
    await expect(page.getByRole("heading", { name: "Quiz comma nâng cao" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toHaveCount(0);

    await page.getByPlaceholder("Tìm theo tên, mô tả, nhóm phân loại hoặc nội dung câu hỏi").fill("co ban");
    await page.getByRole("button", { name: "Tìm kiếm" }).click();
    await expect(page.getByText("Từ khóa: co ban")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toHaveCount(0);

    await page.getByRole("button", { name: "Bỏ lọc nhóm" }).click();
    await expect(page.getByRole("heading", { name: "Quiz cơ bản" })).toBeVisible();

    await page.getByRole("button", { name: "Tất cả" }).click();
    await page.getByTestId("quiz-category-select-quiz-basic").selectOption("cat-tablet");

    await expect.poll(() => updatePayload?.categoryId).toBe("cat-tablet");
  });

  test("should create category from category tree panel", async ({ page }) => {
    await page.goto("/quizzes");

    await page.getByRole("button", { name: "Thêm nhóm" }).click();
    await page.getByTestId("new-category-name").fill("Tá dược");
    await page.getByTestId("new-category-parent").selectOption("cat-tablet");
    await page.getByTestId("create-category-button").click();

    await page.getByRole("button", { name: "Mở nhóm" }).click();
    await expect(page.getByTestId("category-node-cat-new")).toContainText("Tá dược");
  });
});
