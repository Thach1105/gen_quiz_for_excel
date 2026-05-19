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

  test("should create quiz with custom title and without mode in settings", async ({ page }) => {
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
    await page.getByLabel("Tên quiz").fill("Quiz Dược lý custom");
    await page.getByRole("button", { name: /Tạo bài quiz/i }).click();

    await expect.poll(() => createPayload?.title).toBe("Quiz Dược lý custom");
    await expect.poll(() => createPayload?.settings?.timeLimit).toBe(45);
    expect(createPayload.settings.shuffle).toBe(true);
    expect(createPayload.settings.mode).toBeUndefined();
    expect(createPayload.questions[0].explanation).toContain("single choice");
    expect(createPayload.questions[1].answer).toEqual(["Correct option, with comma", "Correct option 2"]);
  });

  test("should create automatic title from file name when title is empty", async ({ page }) => {
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
      name: "duoc-ly_nang-cao.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("mock xlsx"),
    });

    await page.getByRole("button", { name: /Tạo bài quiz/i }).click();

    await expect.poll(() => createPayload?.title).toContain("duoc ly nang cao -");
    expect(createPayload.title).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test("should create quiz from an Excel question with more than four answers", async ({ page }) => {
    const manyAnswerQuestion = {
      id: 1,
      question: "Question with six answer choices?",
      options: ["Answer A", "Answer B", "Answer C", "Answer D", "Answer E", "Answer F"],
      answer: ["Answer E"],
      type: "Single choice",
      explanation: "The fifth answer should be preserved.",
    };
    let createPayload;

    await page.route("**/api/quiz/upload", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            questions: [manyAnswerQuestion],
            mapping: {
              question: "Câu hỏi",
              options: {
                A: "A",
                B: "B",
                C: "C",
                D: "D",
                E: "E",
                F: "F",
              },
              correctAnswer: "Đáp án đúng",
              type: "Loại câu",
              explanation: "Giải thích",
            },
            validation: {
              valid: true,
              errors: [],
              warnings: [],
              totalQuestions: 1,
            },
            fileName: "six-answers.xlsx",
          },
        }),
      });
    });

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
      name: "six-answers.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("mock xlsx with six answers"),
    });

    await expect(page.getByText("Question with six answer choices?")).toBeVisible();
    await page.getByText("Question with six answer choices?").click();
    await expect(page.getByText("Answer E")).toBeVisible();
    await expect(page.getByText("Answer F")).toBeVisible();

    await page.getByRole("button", { name: /Tạo bài quiz/i }).click();

    await expect.poll(() => createPayload?.questions?.[0]?.options?.length).toBe(6);
    expect(createPayload.questions[0].options).toEqual(["Answer A", "Answer B", "Answer C", "Answer D", "Answer E", "Answer F"]);
    expect(createPayload.questions[0].answer).toEqual(["Answer E"]);
  });
});
