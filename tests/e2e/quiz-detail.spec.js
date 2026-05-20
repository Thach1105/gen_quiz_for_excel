import { test, expect } from "@playwright/test";
import { mockCategories } from "./helpers.js";

const normalizeOption = (option, index) => {
  if (typeof option === "string") {
    return { id: `option-${index + 1}`, text: option, image: null };
  }

  return {
    id: option?.id || `option-${index + 1}`,
    text: option?.text || "",
    image: option?.image || null,
  };
};

const createQuestion = ({
  id,
  question,
  options,
  answer,
  answerOptionIds,
  type = "Single choice",
  explanation = "",
  questionImage = null,
}) => {
  const normalizedOptions = (options || ["Option A", "Option B"]).map(normalizeOption);
  const resolvedAnswer = Array.isArray(answer) ? answer : [normalizedOptions[0]?.text].filter(Boolean);
  const resolvedAnswerOptionIds = Array.isArray(answerOptionIds)
    ? answerOptionIds
    : normalizedOptions.filter(option => resolvedAnswer.includes(option.text)).map(option => option.id);

  return {
    id,
    question,
    options: normalizedOptions,
    answer: resolvedAnswer,
    answerOptionIds: resolvedAnswerOptionIds,
    type,
    explanation,
    questionImage,
  };
};

const createQuizDetailFixture = () => ({
  id: "mock-quiz",
  title: "Quiz mock E2E",
  description: "Quiz used to test the detail flow",
  settings: {
    timeLimit: 30,
    shuffle: false,
  },
  questions: [
    createQuestion({
      id: 1,
      question: "Question one for detail page?",
      options: ["Alpha", "Beta", "Gamma", "Delta"],
      answer: ["Alpha"],
      answerOptionIds: ["option-1"],
      explanation: "Explanation one.",
    }),
    createQuestion({
      id: 2,
      question: "Question two for detail page?",
      options: ["One", "Two", "Three", "Four"],
      answer: ["Three"],
      answerOptionIds: ["option-3"],
      explanation: "Explanation two.",
    }),
  ],
});

const mockQuizDetailPage = async (page, { initialQuiz, onUpdate } = {}) => {
  let currentQuiz = JSON.parse(JSON.stringify(initialQuiz || createQuizDetailFixture()));

  await page.route("**/api/quiz/categories", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: mockCategories }),
    });
  });

  await page.route("**/api/quiz/mock-quiz", async route => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: currentQuiz }),
      });
      return;
    }

    if (method === "PUT") {
      const payload = route.request().postDataJSON();
      onUpdate?.(payload);
      currentQuiz = {
        ...currentQuiz,
        ...payload,
        questions: payload.questions || currentQuiz.questions,
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: currentQuiz }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route("**/api/quiz/upload-image", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          url: "https://example.com/mock-image.png",
          publicId: "mock-image",
        },
      }),
    });
  });

  return currentQuiz;
};

const openDetailPage = async (page) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/quiz/mock-quiz/edit");
};

const startEditingQuestion = async (page, index = 0) => {
  await page.getByRole("button", { name: "Chỉnh sửa" }).nth(index).click();
};

const saveEditedQuestion = async (page) => {
  await page.getByRole("button", { name: /Lưu câu hỏi/i }).click();
};

test.describe("Quiz Detail Editing", () => {
  test("shows fixed navigator sidebar and scroll targets", async ({ page }) => {
    await mockQuizDetailPage(page);
    await openDetailPage(page);

    const sidebar = page.locator("aside").filter({ hasText: "Danh sách số câu hỏi" });
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveClass(/fixed/);
    await expect(page.getByRole("button", { name: "1" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "2" }).first()).toBeVisible();
    await expect(page.getByText("2 câu", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "2" }).first().click();
    await expect(page.getByRole("heading", { name: "Question two for detail page?" })).toBeVisible();
  });

  test("adds a new blank question from sidebar and saves it after selecting a correct answer", async ({ page }) => {
    let lastUpdate;
    await mockQuizDetailPage(page, { onUpdate: payload => { lastUpdate = payload; } });
    await openDetailPage(page);

    await page.getByRole("button", { name: "Thêm câu hỏi mới" }).first().click();
    await expect(page.getByText("Chỉnh sửa câu 3")).toBeVisible();
    await expect(page.getByText("A", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("B", { exact: true }).first()).toBeVisible();

    const textareas = page.locator("textarea");
    await textareas.nth(0).fill("New question created from detail page?");
    await textareas.nth(1).fill("First option");
    await textareas.nth(2).fill("Second option");
    await page.getByTestId("answer-toggle-0").click();

    await saveEditedQuestion(page);

    await expect.poll(() => lastUpdate?.questions?.length).toBe(3);
    const savedQuestion = lastUpdate.questions[lastUpdate.questions.length - 1];
    expect(savedQuestion.question).toBe("New question created from detail page?");
    expect(savedQuestion.options.map(option => option.text)).toEqual(["First option", "Second option"]);
    expect(savedQuestion.answerOptionIds).toEqual([savedQuestion.options[0].id]);
    await expect(page.getByRole("heading", { name: "New question created from detail page?" })).toBeVisible();
  });

  test("shows validation errors for duplicate options and missing correct answer", async ({ page }) => {
    let updateCount = 0;
    await mockQuizDetailPage(page, { onUpdate: () => { updateCount += 1; } });
    await openDetailPage(page);

    await page.getByRole("button", { name: "Thêm câu hỏi mới" }).first().click();

    const textareas = page.locator("textarea");
    await textareas.nth(0).fill("Question needs validation?");
    await textareas.nth(1).fill("Duplicate");
    await textareas.nth(2).fill("Duplicate");

    await saveEditedQuestion(page);
    await expect(page.getByText("Các đáp án không được trùng nhau")).toBeVisible();
    await expect.poll(() => updateCount).toBe(0);

    await textareas.nth(2).fill("Unique option");
    await saveEditedQuestion(page);
    await expect(page.getByText("Cần chọn ít nhất 1 đáp án đúng")).toBeVisible();
    await expect.poll(() => updateCount).toBe(0);
  });

  test("edits an existing question, adds an option and persists normalized payload", async ({ page }) => {
    let lastUpdate;
    await mockQuizDetailPage(page, { onUpdate: payload => { lastUpdate = payload; } });
    await openDetailPage(page);

    await startEditingQuestion(page, 0);

    const textareas = page.locator("textarea");
    await textareas.nth(0).fill("Updated detail question?");
    await textareas.nth(1).fill("Updated Alpha");
    await page.getByRole("button", { name: "Thêm đáp án" }).click();
    await textareas.nth(5).fill("New option E");

    await saveEditedQuestion(page);

    await expect.poll(() => lastUpdate?.questions?.[0]?.question).toBe("Updated detail question?");
    expect(lastUpdate.questions[0].options.map(option => option.text)).toEqual([
      "Updated Alpha",
      "Beta",
      "Gamma",
      "Delta",
      "New option E",
    ]);
    await expect(page.getByRole("heading", { name: "Updated detail question?" })).toBeVisible();
    await expect(page.getByText("New option E")).toBeVisible();
  });

  test("removes question and option images before saving", async ({ page }) => {
    let lastUpdate;
    await mockQuizDetailPage(page, {
      initialQuiz: {
        ...createQuizDetailFixture(),
        questions: [
          createQuestion({
            id: 1,
            question: "Question with images?",
            options: [
              {
                id: "option-1",
                text: "Alpha",
                image: { url: "https://example.com/option-alpha.png", publicId: "option-alpha" },
              },
              "Beta",
            ],
            answer: ["Alpha"],
            answerOptionIds: ["option-1"],
            questionImage: { url: "https://example.com/question-image.png", publicId: "question-image" },
          }),
          createQuestion({
            id: 2,
            question: "Second question?",
            options: ["One", "Two"],
            answer: ["One"],
            answerOptionIds: ["option-1"],
          }),
        ],
      },
      onUpdate: payload => { lastUpdate = payload; },
    });
    await openDetailPage(page);

    await startEditingQuestion(page, 0);
    await expect(page.getByTestId("remove-question-image")).toBeVisible();
    await expect(page.getByTestId("remove-option-image-0")).toBeVisible();

    await page.getByTestId("remove-question-image").click();
    await page.getByTestId("remove-option-image-0").click();

    await expect(page.getByTestId("remove-question-image")).toHaveCount(0);
    await expect(page.getByTestId("remove-option-image-0")).toHaveCount(0);

    await saveEditedQuestion(page);

    await expect.poll(() => lastUpdate?.questions?.[0]).toBeTruthy();
    expect(lastUpdate.questions[0].questionImage).toBeNull();
    expect(lastUpdate.questions[0].options[0].image).toBeNull();
    await expect(page.getByAltText("Question 1")).toHaveCount(0);
    await expect(page.getByAltText("Option 1")).toHaveCount(0);
  });

  test("deletes a question and updates navigator count", async ({ page }) => {
    let lastUpdate;
    await mockQuizDetailPage(page, { onUpdate: payload => { lastUpdate = payload; } });
    await openDetailPage(page);

    await page.getByRole("button", { name: "Xóa câu hỏi" }).nth(0).click();

    await expect.poll(() => lastUpdate?.questions?.length).toBe(1);
    expect(lastUpdate.questions[0].question).toBe("Question two for detail page?");
    await expect(page.getByRole("heading", { name: "Question one for detail page?" })).toHaveCount(0);
    await expect(page.getByText("1 câu", { exact: true }).first()).toBeVisible();
  });
});
