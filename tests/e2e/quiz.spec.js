import { test, expect } from "@playwright/test";
import { mockQuizApi } from "./helpers.js";

test.describe("Quiz Taking Flow", () => {
  test("exam mode should hide answers until submit", async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/quiz/mock-quiz/take");

    await page.getByTestId("mode-exam").click();
    await page.getByRole("button", { name: /Bắt đầu làm bài/i }).click();

    await expect(page.getByText("Single choice sample question?")).toBeVisible();
    await expect(page.getByText("Multiple choice sample question with comma option?")).toBeVisible();
    await expect(page.getByText("Last question for navigation?")).toBeVisible();
    await expect(page.getByText("Đáp án đúng:")).toHaveCount(0);

    await page.getByTestId("option-1-0").click();
    await expect(page.getByTestId("question-nav-1").first()).toHaveAttribute("data-status", "current");

    await page.getByTestId("option-2-0").click();
    await page.getByTestId("option-2-1").click();
    await expect(page.getByTestId("option-2-0")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("option-2-1")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("option-2-0")).toHaveAttribute("data-correct", "true");

    await page.getByTestId("option-3-2").click();
    await page.getByTestId("submit-quiz").click();

    await expect(page.getByText("Kết quả của bạn")).toBeVisible();
    await expect(page.getByTestId("result-question-detail-2")).toHaveCount(0);
    await page.getByTestId("result-question-toggle-2").click();
    await page.getByTestId("result-question-toggle-3").click();
    await expect(page.getByText("Đáp án đúng:").first()).toBeVisible();
    await expect(page.getByText("Correct option, with comma; Correct option 2").first()).toBeVisible();
    await expect(page.getByText("The correct answer for the last question is Three.")).toBeVisible();
  });

  test("practice mode should reveal answer and lock revealed question", async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/quiz/mock-quiz/take");

    await page.getByTestId("mode-practice").click();
    await page.getByRole("button", { name: /Bắt đầu làm bài/i }).click();

    await page.getByTestId("option-1-1").click();
    await page.locator("#question-1").getByTestId("show-answer-button").click();

    await expect(page.locator("#question-1").getByTestId("practice-feedback")).toBeVisible();
    await expect(page.getByText("Bạn chưa chọn đúng")).toBeVisible();
    await expect(page.getByText("Correct A is the right answer for the single choice question.")).toBeVisible();
    await expect(page.getByTestId("option-1-0")).toBeDisabled();
    await expect(page.getByTestId("question-nav-1").first()).toHaveAttribute("data-status", "current");

    await page.getByTestId("question-nav-2").first().click();
    await expect(page.getByText("Multiple choice sample question with comma option?")).toBeVisible();
    await page.getByTestId("option-2-0").click();
    await page.getByTestId("option-2-1").click();
    await expect(page.getByTestId("option-2-0")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("option-2-1")).toHaveAttribute("data-selected", "true");
    await page.locator("#question-2").getByTestId("show-answer-button").click();
    await expect(page.getByText("Correct option, with comma; Correct option 2")).toBeVisible();
    await expect(page.getByText("The first two options are correct, including one option that contains a comma.")).toBeVisible();
  });

  test("question navigator should jump between answered and unanswered questions", async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/quiz/mock-quiz/take");

    await page.getByRole("button", { name: /Bắt đầu làm bài/i }).click();
    await page.getByTestId("option-1-0").click();
    await page.getByTestId("question-nav-2").first().click();

    await expect(page.getByText("Multiple choice sample question with comma option?")).toBeVisible();
    await expect(page.getByTestId("question-nav-1").first()).toHaveAttribute("data-status", "answered");
    await expect(page.getByTestId("question-nav-2").first()).toHaveAttribute("data-status", "current");
    await expect(page.getByTestId("question-nav-3").first()).toHaveAttribute("data-status", "unanswered");
  });

  test("timer should auto submit when time is over", async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/quiz/fast-timer/take");

    await page.getByTestId("mode-exam").click();
    await page.getByRole("button", { name: /Bắt đầu làm bài/i }).click();

    await expect(page.getByText("Hết giờ, hệ thống đã tự nộp bài")).toBeVisible({ timeout: 5000 });
  });

  test("practice mode can run without timer", async ({ page }) => {
    await mockQuizApi(page);
    await page.goto("/quiz/mock-quiz/take");

    await page.getByTestId("mode-practice").click();
    await page.getByTestId("practice-timer-toggle").click();
    await page.getByRole("button", { name: /Bắt đầu làm bài/i }).click();

    await expect(page.getByTestId("timer-display")).toHaveText("Không giới hạn");
    await page.waitForTimeout(1200);
    await expect(page.getByText("Single choice sample question?")).toBeVisible();
    await expect(page.getByText("Kết quả của bạn")).toHaveCount(0);
  });
});
