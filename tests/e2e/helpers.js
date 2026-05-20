export const mockQuestions = [
  {
    id: 1,
    question: "Single choice sample question?",
    options: ["Correct A", "Wrong B", "Wrong C", "Wrong D"],
    answer: ["Correct A"],
    type: "Single choice",
    explanation: "Correct A is the right answer for the single choice question.",
  },
  {
    id: 2,
    question: "Multiple choice sample question with comma option?",
    options: ["Correct option, with comma", "Correct option 2", "Wrong option 1", "Wrong option 2"],
    answer: ["Correct option, with comma", "Correct option 2"],
    type: "Multiple choice",
    explanation: "The first two options are correct, including one option that contains a comma.",
  },
  {
    id: 3,
    question: "Last question for navigation?",
    options: ["One", "Two", "Three", "Four"],
    answer: ["Three"],
    type: "Single choice",
    explanation: "The correct answer for the last question is Three.",
  },
];

export const mockQuiz = {
  id: "mock-quiz",
  title: "Quiz mock E2E",
  description: "Quiz used to test the taking flow",
  questions: mockQuestions,
  settings: {
    timeLimit: 1,
    shuffle: false,
  },
};

export const mockFastTimerQuiz = {
  ...mockQuiz,
  id: "fast-timer",
  settings: {
    timeLimit: 0.02,
    shuffle: false,
  },
};

export const mockCategories = [
  { id: "cat-pharma", name: "Dược lý", parentId: null },
  { id: "cat-tablet", name: "Viên nén", parentId: "cat-pharma" },
];

export const mockDocumentQuestions = [
  {
    id: 1,
    question: "PDF question 1?",
    options: ["Option A", "Option B", "Option C", "Option D"],
    answer: ["Option A"],
    type: "Single choice",
    explanation: "Explanation for PDF question 1.",
  },
  {
    id: 2,
    question: "PDF question 2?",
    options: ["Choice 1", "Choice 2", "Choice 3", "Choice 4"],
    answer: ["Choice 2", "Choice 3"],
    type: "Multiple choice",
    explanation: "Explanation for PDF question 2.",
  },
];

export const mockQuizApi = async (page, quiz = mockQuiz) => {
  await page.route("**/api/quiz/categories", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: mockCategories }),
    });
  });

  await page.route("**/api/quiz/upload", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          questions: mockQuestions,
          mapping: {
            question: "Câu hỏi",
            optionA: "A",
            optionB: "B",
            optionC: "C",
            optionD: "D",
            correctAnswer: "Đáp án đúng",
            type: "Loại câu",
            explanation: "Giải thích",
          },
          validation: {
            valid: true,
            errors: [],
            warnings: [],
            totalQuestions: mockQuestions.length,
          },
          fileName: "quiz-template.xlsx",
        },
      }),
    });
  });

  await page.route("**/api/quiz/mock-quiz", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: quiz,
      }),
    });
  });

  await page.route("**/api/quiz/fast-timer", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: mockFastTimerQuiz,
      }),
    });
  });
};

export const mockDocumentExtractSuccess = async (page, questions = mockDocumentQuestions, fileName = "quiz-document.pdf") => {
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
          fileName,
        },
      }),
    });
  });
};

export const mockDocumentExtractError = async (page, { status = 502, error = "Failed to extract quiz from document" } = {}) => {
  await page.route("**/api/quiz/extract-from-document", async route => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ error }),
    });
  });
};

export const mockDocumentExtractDelayed = async (page, { delayMs = 3000, response } = {}) => {
  await page.route("**/api/quiz/extract-from-document", async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response || {
        success: true,
        data: {
          questions: mockDocumentQuestions,
          validation: {
            valid: true,
            errors: [],
            warnings: [],
            totalQuestions: mockDocumentQuestions.length,
          },
          fileName: "quiz-document.pdf",
        },
      }),
    });
  });
};

export const mockCreateQuiz = async (page, onCreate) => {
  await page.route("**/api/quiz", async route => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      onCreate?.(payload);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "created-quiz", ...payload },
        }),
      });
      return;
    }

    await route.fallback();
  });
};
