import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StepsSection from "@/components/StepsSection";
import UploadSection from "@/components/UploadSection";
import PreviewSection from "@/components/PreviewSection";
import FooterSection from "@/components/FooterSection";
import ImportingModal from "@/components/ImportingModal";
import ImportErrorModal from "@/components/ImportErrorModal";
import { createQuiz, extractFromDocument, getAllCategories } from "@/services/api";

const normalizeKeyword = (value) =>
  String(value || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getQuestionKeyword = (questions) => {
  const firstQuestion = normalizeKeyword(questions?.[0]?.question);
  return firstQuestion.split(" ").filter(Boolean).slice(0, 8).join(" ");
};

const padDatePart = (value) => String(value).padStart(2, "0");

const formatTitleTime = (date = new Date()) =>
  `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;

const generateQuizTitle = ({ fileName, questions }) => {
  const keyword = normalizeKeyword(fileName) || getQuestionKeyword(questions) || "Quiz";
  return `${keyword} - ${formatTitleTime()}`;
};

export default function Home() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importingDocument, setImportingDocument] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [questionSource, setQuestionSource] = useState(null);
  const [documentImportError, setDocumentImportError] = useState(null);
  const abortControllerRef = useRef(null);
  const lastDocumentFileRef = useRef(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getAllCategories();
        if (response.success) {
          setCategories(response.data);
        }
      } catch (err) {
        setError(err.message || "Không thể tải nhóm phân loại");
      }
    };

    fetchCategories();
  }, []);

  const getFriendlyDocumentImportError = (err) => {
    const message = String(err?.message || "").toLowerCase();
    if (message.includes("invalid quiz data") || message.includes("no questions extracted")) {
      return {
        title: "Chưa thể tạo câu hỏi từ tài liệu",
        message: "Tài liệu này chưa được nhận diện thành bộ câu hỏi hợp lệ. Bạn hãy thử PDF khác hoặc điều chỉnh nội dung rồi import lại.",
      };
    }

    if (
      message.includes("quota")
      || message.includes("resource_exhausted")
      || message.includes("unavailable")
      || message.includes("overloaded")
      || message.includes("internal error")
      || message.includes("empty response")
    ) {
      return {
        title: "AI đang bận xử lý",
        message: "Hệ thống AI hiện chưa xử lý được tài liệu này. Bạn vui lòng thử lại sau ít phút hoặc chọn lại file để import lại.",
      };
    }

    return {
      title: "Chưa thể tạo câu hỏi từ tài liệu",
      message: "Đã có lỗi khi phân tích PDF. Bạn hãy thử lại hoặc chọn một tài liệu khác.",
    };
  };

  const resetDocumentPreview = () => {
    setQuestions([]);
    setQuestionSource(null);
    setSuccess(null);
    setError(null);
    setDocumentImportError(null);
  };

  const handleQuestionsLoaded = (loadedQuestions, source = "excel") => {
    setQuestions(loadedQuestions);
    setQuestionSource(source);
    setError(null);
    setDocumentImportError(null);
    setSuccess(
      source === "document"
        ? "Phân tích PDF thành công! Kiểm tra preview bên dưới trước khi tạo quiz."
        : "Upload thành công! Kiểm tra preview bên dưới.",
    );

    setTimeout(() => {
      document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const handleCancelImport = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setImportingDocument(false);
    setDocumentImportError(null);
    setSuccess("Đã hủy import PDF.");
  };

  const handleCloseDocumentError = () => {
    setDocumentImportError(null);
  };

  const handleDocumentImport = async (file) => {
    if (!file) return;

    lastDocumentFileRef.current = file;
    setError(null);
    setSuccess(null);
    setDocumentImportError(null);
    setImportingDocument(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await extractFromDocument(file, controller.signal);
      if (response.success) {
        handleQuestionsLoaded(response.data.questions, "document");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      const friendlyError = getFriendlyDocumentImportError(err);
      setDocumentImportError(friendlyError);
      setError(null);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setImportingDocument(false);
    }
  };

  const handleRetryDocumentImport = async () => {
    if (!lastDocumentFileRef.current) {
      setDocumentImportError(null);
      return;
    }

    setDocumentImportError(null);
    await handleDocumentImport(lastDocumentFileRef.current);
  };

  const handleCreateQuiz = async (settings) => {
    if (questions.length === 0) {
      setError(
        settings.mode === "document"
          ? "Chưa có câu hỏi từ PDF để tạo quiz"
          : "Không có câu hỏi để tạo quiz",
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const quizData = {
        title: settings.quizTitle?.trim() || generateQuizTitle({
          fileName: settings.fileName,
          questions,
        }),
        description:
          settings.mode === "document"
            ? "Quiz được tạo từ file PDF bằng Gemini"
            : "Quiz được tạo từ file Excel",
        questions,
        categoryId: settings.categoryId || null,
        settings: {
          timeLimit: settings.timeLimit,
          shuffle: settings.shuffle,
        },
      };

      const response = await createQuiz(quizData);

      if (response.success) {
        setSuccess("Tạo quiz thành công! Đang chuyển đến danh sách quiz...");
        setTimeout(() => {
          navigate("/quizzes");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi tạo quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-28 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute top-24 right-0 h-[28rem] w-[28rem] rounded-full bg-purple-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        <ImportingModal visible={importingDocument} onCancel={handleCancelImport} />
        <ImportErrorModal
          visible={Boolean(documentImportError)}
          title={documentImportError?.title}
          message={documentImportError?.message}
          onClose={handleCloseDocumentError}
          onRetry={lastDocumentFileRef.current ? handleRetryDocumentImport : null}
        />

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            Đang tạo quiz...
          </div>
        )}

        <HeroSection />
        <StepsSection />
        <UploadSection
          categories={categories}
          onQuestionsLoaded={handleQuestionsLoaded}
          onDocumentImport={handleDocumentImport}
          onCreateQuiz={handleCreateQuiz}
          onResetDocumentPreview={resetDocumentPreview}
          hasDocumentPreview={questionSource === "document" && questions.length > 0}
        />
        <PreviewSection questions={questions} />
        <FooterSection />
      </main>
    </div>
  );
}
