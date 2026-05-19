import { test, expect } from "@playwright/test";
import { mockQuizApi } from "./helpers.js";

test.describe("Upload Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/");
  });

  test("should upload a template file and show explanation in preview", async ({ page }) => {
    await page.locator("input[type='file']").setInputFiles({
      name: "quiz-template.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("mock xlsx"),
    });

    await expect(page.getByText("quiz-template.xlsx")).toBeVisible();
    await expect(page.getByText("Single choice sample question?")).toBeVisible();
    await expect(page.getByText("Có giải thích").first()).toBeVisible();

    await page.getByText("Single choice sample question?").click();
    await expect(page.getByText("Correct A is the right answer for the single choice question.")).toBeVisible();
  });

  test("should create quiz without mode in settings", async ({ page }) => {
    let createPayload;

    await page.route("**/api/quiz", async route => {
      if (route.request().method() === "POST") {
        createPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "created-quiz", ...createPayload },
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.locator("input[type='file']").setInputFiles({
      name: "quiz-template.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("mock xlsx"),
    });

    await page.locator("input[type='number']").fill("45");
    await page.getByRole("button", { name: /Tạo bài quiz/i }).click();

    await expect.poll(() => createPayload?.settings?.timeLimit).toBe(45);
    expect(createPayload.settings.shuffle).toBe(true);
    expect(createPayload.settings.mode).toBeUndefined();
    expect(createPayload.questions[0].explanation).toContain("single choice");
    expect(createPayload.questions[1].answer).toEqual(["Correct option, with comma", "Correct option 2"]);
  });
});
