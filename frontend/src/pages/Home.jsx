import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StepsSection from "@/components/StepsSection";
import UploadSection from "@/components/UploadSection";
import PreviewSection from "@/components/PreviewSection";
import FooterSection from "@/components/FooterSection";
import { createQuiz } from "@/services/api";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleQuestionsLoaded = (loadedQuestions) => {
    setQuestions(loadedQuestions);
    setError(null);
    setSuccess("Upload thành công! Kiểm tra preview bên dưới.");
    
    setTimeout(() => {
      document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  const handleCreateQuiz = async (settings) => {
    if (questions.length === 0) {
      setError("Không có câu hỏi để tạo quiz");
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
        description: "Quiz được tạo từ file Excel",
        questions,
        settings: {
          timeLimit: settings.timeLimit,
          shuffle: settings.shuffle,
        },
      };

      const response = await createQuiz(quizData);
      
      if (response.success) {
        setSuccess(`Tạo quiz thành công! Đang chuyển đến danh sách quiz...`);
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
            Đang xử lý...
          </div>
        )}

        <HeroSection />
        <StepsSection />
        <UploadSection 
          onQuestionsLoaded={handleQuestionsLoaded}
          onCreateQuiz={handleCreateQuiz}
        />
        <PreviewSection questions={questions} />
        <FooterSection />
      </main>
    </div>
  );
}
