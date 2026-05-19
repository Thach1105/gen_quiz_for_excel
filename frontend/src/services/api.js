const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Upload Excel file and parse
 */
export const uploadExcelFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/quiz/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload file");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Create a new quiz
 */
export const createQuiz = async (quizData) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quizData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create quiz");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating quiz:", error);
    throw error;
  }
};

/**
 * Get quiz by ID
 */
export const getQuizById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get quiz");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting quiz:", error);
    throw error;
  }
};

/**
 * Get all quizzes
 */
export const getAllQuizzes = async (limit = 10, offset = 0) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz?limit=${limit}&offset=${offset}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get quizzes");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting quizzes:", error);
    throw error;
  }
};

/**
 * Update quiz
 */
export const updateQuiz = async (id, updates) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update quiz");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating quiz:", error);
    throw error;
  }
};

/**
 * Delete quiz
 */
export const deleteQuiz = async (id) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete quiz");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting quiz:", error);
    throw error;
  }
};
