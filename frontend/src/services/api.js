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

export const extractFromDocument = async (file, signal) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/quiz/extract-from-document`, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to extract quiz from document");
  }

  return await response.json();
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
export const getAllQuizzes = async ({ limit = 10, offset = 0, search = "", categoryId = "all", sortBy = "latest" } = {}) => {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      search,
      categoryId,
      sortBy,
    });
    const response = await fetch(`${API_URL}/api/quiz?${params.toString()}`);

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

export const uploadQuizImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/quiz/upload-image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload image");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading quiz image:", error);
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

export const getAllCategories = async () => {
  try {
    const response = await fetch(`${API_URL}/api/quiz/categories`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get categories");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting categories:", error);
    throw error;
  }
};

export const createCategory = async (categoryData) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create category");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};

export const updateCategory = async (id, updates) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz/categories/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update category");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

export const deleteCategory = async (id) => {
  try {
    const response = await fetch(`${API_URL}/api/quiz/categories/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete category");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};
