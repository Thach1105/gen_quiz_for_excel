import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  FileQuestion,
  LayoutGrid,
  ListChecks,
  PlayCircle,
  Plus,
  Save,
  Search,
  Share2,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteQuiz, getAllQuizzes, updateQuiz } from "@/services/api";
import { isMultipleChoice } from "@/utils/questionType";

const getQuizId = (quiz) => quiz.id || quiz._id;

const formatDate = (value) => {
  if (!value) return "Chưa rõ ngày";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ ngày";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getQuizMetrics = (quiz) => {
  const questions = quiz.questions || [];
  return {
    questionCount: questions.length,
    explanationCount: questions.filter(question => Boolean(question.explanation)).length,
    multipleChoiceCount: questions.filter(question => isMultipleChoice(question.type)).length,
    timeLimit: quiz.settings?.timeLimit || 30,
  };
};

export default function QuizList() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("grid");
  const [copiedId, setCopiedId] = useState(null);
  const [expandedQuizId, setExpandedQuizId] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameError, setRenameError] = useState(null);
  const [editingTimeQuizId, setEditingTimeQuizId] = useState(null);
  const [editingTimeLimit, setEditingTimeLimit] = useState("");
  const [savingTimeId, setSavingTimeId] = useState(null);
  const [timeEditError, setTimeEditError] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const response = await getAllQuizzes(100, 0);
      if (response.success) {
        setQuizzes(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dashboard = useMemo(() => {
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + getQuizMetrics(quiz).questionCount, 0);
    const totalMinutes = quizzes.reduce((sum, quiz) => sum + getQuizMetrics(quiz).timeLimit, 0);
    const withExplanation = quizzes.reduce((sum, quiz) => sum + getQuizMetrics(quiz).explanationCount, 0);

    return {
      totalQuizzes: quizzes.length,
      totalQuestions,
      averageMinutes: quizzes.length ? Math.round(totalMinutes / quizzes.length) : 0,
      withExplanation,
    };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matched = quizzes.filter((quiz) => {
      if (!normalizedSearch) return true;
      const text = [
        quiz.title,
        quiz.description,
        ...(quiz.questions || []).map(question => question.question),
      ].join(" ").toLowerCase();
      return text.includes(normalizedSearch);
    });

    return [...matched].sort((a, b) => {
      if (sortBy === "title") {
        return String(a.title || "").localeCompare(String(b.title || ""), "vi");
      }
      if (sortBy === "questions") {
        return getQuizMetrics(b).questionCount - getQuizMetrics(a).questionCount;
      }
      if (sortBy === "time") {
        return getQuizMetrics(b).timeLimit - getQuizMetrics(a).timeLimit;
      }

      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [quizzes, searchTerm, sortBy]);

  const handleDelete = async (id) => {
    if (!confirm("Đồng ý xóa quiz này?")) return;

    try {
      await deleteQuiz(id);
      setQuizzes(quizzes.filter(q => getQuizId(q) !== id));
    } catch (err) {
      alert("Lỗi khi xóa quiz: " + err.message);
    }
  };

  const handleTakeQuiz = (id) => {
    navigate(`/quiz/${id}/take`);
  };

  const handleShare = async (id) => {
    const shareUrl = `${window.location.origin}/quiz/${id}/take`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      alert("Không thể copy tự động. Link quiz: " + shareUrl);
    }
  };

  const togglePreview = (id) => {
    setExpandedQuizId(prev => (prev === id ? null : id));
  };

  const startRename = (quiz) => {
    setEditingQuizId(getQuizId(quiz));
    setEditingTitle(quiz.title || "");
    setRenameError(null);
  };

  const cancelRename = () => {
    setEditingQuizId(null);
    setEditingTitle("");
    setRenameError(null);
  };

  const handleSaveRename = async (id) => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      setRenameError("Tên quiz không được để trống");
      return;
    }

    try {
      setRenamingId(id);
      setRenameError(null);
      const response = await updateQuiz(id, { title: nextTitle });
      const updatedQuiz = response.data;
      setQuizzes(prev => prev.map(quiz => (
        getQuizId(quiz) === id
          ? { ...quiz, title: updatedQuiz?.title || nextTitle, updatedAt: updatedQuiz?.updatedAt || quiz.updatedAt }
          : quiz
      )));
      cancelRename();
    } catch (err) {
      setRenameError(err.message || "Không thể cập nhật tên quiz");
    } finally {
      setRenamingId(null);
    }
  };

  const handleRenameKeyDown = (event, id) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSaveRename(id);
    }
    if (event.key === "Escape") {
      cancelRename();
    }
  };

  const startEditTime = (quiz) => {
    setEditingTimeQuizId(getQuizId(quiz));
    setEditingTimeLimit(String(getQuizMetrics(quiz).timeLimit));
    setTimeEditError(null);
  };

  const cancelEditTime = () => {
    setEditingTimeQuizId(null);
    setEditingTimeLimit("");
    setTimeEditError(null);
  };

  const handleSaveTime = async (quiz) => {
    const quizId = getQuizId(quiz);
    const nextTimeLimit = Number.parseInt(editingTimeLimit, 10);
    if (!Number.isInteger(nextTimeLimit) || nextTimeLimit < 1 || nextTimeLimit > 180) {
      setTimeEditError("Thời gian phải từ 1 đến 180 phút");
      return;
    }

    const nextSettings = {
      ...(quiz.settings || {}),
      timeLimit: nextTimeLimit,
    };

    try {
      setSavingTimeId(quizId);
      setTimeEditError(null);
      const response = await updateQuiz(quizId, { settings: nextSettings });
      const updatedQuiz = response.data;
      setQuizzes(prev => prev.map(item => (
        getQuizId(item) === quizId
          ? {
              ...item,
              settings: updatedQuiz?.settings || nextSettings,
              updatedAt: updatedQuiz?.updatedAt || item.updatedAt,
            }
          : item
      )));
      cancelEditTime();
    } catch (err) {
      setTimeEditError(err.message || "Không thể cập nhật thời gian");
    } finally {
      setSavingTimeId(null);
    }
  };

  const handleTimeKeyDown = (event, quiz) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSaveTime(quiz);
    }
    if (event.key === "Escape") {
      cancelEditTime();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Đang tải danh sách quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Không gian quản lý quiz
            </div>
            <h1 className="text-4xl font-black text-gray-900">Danh sách Quiz</h1>
            <p className="mt-2 max-w-2xl text-gray-600">
              Tìm nhanh, xem cấu trúc câu hỏi, copy link chia sẻ và bắt đầu làm bài từ một nơi.
            </p>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="h-12 rounded-2xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-5 w-5" />
            Tạo quiz mới
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Bộ quiz", value: dashboard.totalQuizzes, icon: FileQuestion, color: "text-blue-700 bg-blue-50 border-blue-100" },
            { label: "Tổng câu hỏi", value: dashboard.totalQuestions, icon: ListChecks, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
            { label: "Phút trung bình", value: dashboard.averageMinutes, icon: Clock, color: "text-amber-700 bg-amber-50 border-amber-100" },
            { label: "Có giải thích", value: dashboard.withExplanation, icon: CheckCircle2, color: "text-rose-700 bg-rose-50 border-rose-100" },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.color}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold">{item.label}</span>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-black text-gray-900">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto_auto]">
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên, mô tả hoặc nội dung câu hỏi"
              className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
            />
          </label>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-700 outline-none"
          >
            <option value="latest">Mới cập nhật</option>
            <option value="title">Tên A-Z</option>
            <option value="questions">Nhiều câu hỏi</option>
            <option value="time">Thời gian dài</option>
          </select>

          <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex h-9 items-center justify-center rounded-lg px-3 text-sm font-bold ${
                viewMode === "grid" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"
              }`}
              aria-label="Hiển thị dạng lưới"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              className={`flex h-9 items-center justify-center rounded-lg px-3 text-sm font-bold ${
                viewMode === "compact" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"
              }`}
              aria-label="Hiển thị dạng gọn"
            >
              <ListChecks className="h-4 w-4" />
            </button>
          </div>
        </div>

        {quizzes.length === 0 ? (
          <Card className="rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl">
            <CardContent className="p-12 text-center">
              <FileQuestion className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="mb-2 text-xl font-bold text-gray-900">Chưa có quiz nào</h3>
              <p className="mb-6 text-gray-600">Hãy tạo quiz đầu tiên của bạn</p>
              <Button
                onClick={() => navigate("/")}
                className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
              >
                Tạo quiz ngay
              </Button>
            </CardContent>
          </Card>
        ) : filteredQuizzes.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-amber-600" />
            <h3 className="font-black text-gray-900">Không tìm thấy quiz phù hợp</h3>
            <p className="mt-1 text-sm text-gray-600">Thử đổi từ khóa hoặc bộ sắp xếp.</p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3" : "space-y-4"}>
            {filteredQuizzes.map((quiz, idx) => {
              const quizId = getQuizId(quiz);
              const metrics = getQuizMetrics(quiz);
              const isExpanded = expandedQuizId === quizId;
              const compact = viewMode === "compact";
              const isEditing = editingQuizId === quizId;
              const isEditingTime = editingTimeQuizId === quizId;

              return (
                <motion.div
                  key={quizId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                >
                  <Card className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
                    <CardContent className={compact ? "p-5" : "p-6"}>
                      <div className={compact ? "grid gap-4 lg:grid-cols-[1fr_auto]" : ""}>
                        <div>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(quiz.updatedAt || quiz.createdAt)}
                            </span>
                            {quiz.settings?.shuffle && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                <Shuffle className="h-3.5 w-3.5" />
                                Trộn câu
                              </span>
                            )}
                          </div>

                          <div className="mb-2">
                            {isEditing ? (
                              <div>
                                <div className="flex gap-2">
                                  <input
                                    value={editingTitle}
                                    onChange={(event) => setEditingTitle(event.target.value)}
                                    onKeyDown={(event) => handleRenameKeyDown(event, quizId)}
                                    autoFocus
                                    data-testid={`rename-input-${quizId}`}
                                    className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-lg font-black text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => handleSaveRename(quizId)}
                                    disabled={renamingId === quizId}
                                    variant="outline"
                                    className="h-11 rounded-xl border-emerald-300 text-emerald-700"
                                    aria-label="Lưu tên quiz"
                                    data-testid={`rename-save-${quizId}`}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={cancelRename}
                                    variant="outline"
                                    className="h-11 rounded-xl border-gray-300"
                                    aria-label="Hủy sửa tên quiz"
                                    data-testid={`rename-cancel-${quizId}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                {renameError && (
                                  <p className="mt-2 text-xs font-bold text-red-600">{renameError}</p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <h3 className="text-xl font-black text-gray-900">
                                  {quiz.title || "Quiz chưa đặt tên"}
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => startRename(quiz)}
                                  className="mt-0.5 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-blue-200 hover:text-blue-700"
                                  aria-label="Sửa tên quiz"
                                  data-testid={`rename-start-${quizId}`}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="min-h-[2.5rem] text-sm text-gray-600">
                            {quiz.description || "Không có mô tả"}
                          </p>
                        </div>

                        <div className={compact ? "min-w-[18rem]" : ""}>
                          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-2xl bg-gray-50 p-3">
                              <p className="text-lg font-black text-gray-900">{metrics.questionCount}</p>
                              <p className="text-xs font-bold text-gray-500">Câu</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-3">
                              {isEditingTime ? (
                                <div>
                                  <input
                                    type="number"
                                    min="1"
                                    max="180"
                                    value={editingTimeLimit}
                                    onChange={(event) => setEditingTimeLimit(event.target.value)}
                                    onKeyDown={(event) => handleTimeKeyDown(event, quiz)}
                                    autoFocus
                                    data-testid={`time-input-${quizId}`}
                                    className="h-8 w-full rounded-lg border border-blue-200 bg-white px-2 text-center text-sm font-black text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                  />
                                  <div className="mt-2 flex justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveTime(quiz)}
                                      disabled={savingTimeId === quizId}
                                      className="rounded-md bg-emerald-100 p-1 text-emerald-700 disabled:opacity-50"
                                      aria-label="Lưu thời gian"
                                      data-testid={`time-save-${quizId}`}
                                    >
                                      <Save className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditTime}
                                      className="rounded-md bg-gray-200 p-1 text-gray-600"
                                      aria-label="Hủy sửa thời gian"
                                      data-testid={`time-cancel-${quizId}`}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEditTime(quiz)}
                                  className="w-full rounded-xl transition hover:bg-white"
                                  aria-label="Sửa thời gian làm bài"
                                  data-testid={`time-start-${quizId}`}
                                >
                                  <p className="text-lg font-black text-gray-900">{metrics.timeLimit}</p>
                                  <p className="text-xs font-bold text-gray-500">Phút</p>
                                </button>
                              )}
                            </div>
                            <div className="rounded-2xl bg-gray-50 p-3">
                              <p className="text-lg font-black text-gray-900">{metrics.multipleChoiceCount}</p>
                              <p className="text-xs font-bold text-gray-500">Multi</p>
                            </div>
                          </div>
                          {isEditingTime && timeEditError && (
                            <p className="mt-2 text-center text-xs font-bold text-red-600">{timeEditError}</p>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-gray-800">Xem nhanh nội dung</p>
                            <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-500">
                              {metrics.explanationCount} câu có giải thích
                            </span>
                          </div>
                          <div className="space-y-2">
                            {(quiz.questions || []).slice(0, 3).map((question, questionIndex) => (
                              <div key={question.id || questionIndex} className="rounded-xl bg-white p-3 text-sm text-gray-700">
                                <span className="font-black text-blue-700">Câu {questionIndex + 1}: </span>
                                {question.question}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button
                          onClick={() => handleTakeQuiz(quizId)}
                          className="h-11 flex-1 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700"
                        >
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Làm bài
                        </Button>
                        <Button
                          onClick={() => togglePreview(quizId)}
                          variant="outline"
                          className="h-11 rounded-2xl border-gray-300 font-bold"
                        >
                          <FileQuestion className="mr-2 h-4 w-4" />
                          {isExpanded ? "Thu gọn" : "Xem nhanh"}
                        </Button>
                        <Button
                          onClick={() => handleShare(quizId)}
                          variant="outline"
                          className="h-11 rounded-2xl border-gray-300"
                          aria-label="Copy link quiz"
                        >
                          {copiedId === quizId ? <Copy className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                        </Button>
                        <Button
                          onClick={() => handleDelete(quizId)}
                          variant="outline"
                          className="h-11 rounded-2xl border-red-300 text-red-600 hover:bg-red-50"
                          aria-label="Xóa quiz"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
