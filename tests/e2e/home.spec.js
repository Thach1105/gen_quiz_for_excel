import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display core upload flow without quiz mode selection", async ({ page }) => {
    await expect(page.getByText("QuizForge")).toBeVisible();
    await expect(page.getByText("Upload & Cấu hình")).toBeVisible();
    await expect(page.getByText("Trộn câu hỏi")).toBeVisible();
    await expect(page.getByText("Thời gian (phút)")).toBeVisible();
    await expect(page.getByRole("button", { name: /Tạo bài quiz/i })).toBeVisible();

    await expect(page.getByRole("button", { name: "Kiểm tra" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Luyện tập" })).toHaveCount(0);
  });

  test("should display empty preview before upload", async ({ page }) => {
    await expect(page.getByText("Chưa có câu hỏi")).toBeVisible();
    await expect(page.getByText("Upload file Excel hoặc PDF để xem preview câu hỏi")).toBeVisible();
  });

  test("should keep time and shuffle controls usable", async ({ page }) => {
    const timeInput = page.locator("input[type='number']");
    await expect(timeInput).toHaveValue("30");

    await timeInput.fill("45");
    await expect(timeInput).toHaveValue("45");

    await page.getByTestId("shuffle-toggle").click();
    await page.getByTestId("shuffle-toggle").click();
  });
});
