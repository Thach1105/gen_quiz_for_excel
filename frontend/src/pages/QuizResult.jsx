import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Home,
  ListChecks,
  RotateCcw,
  Target,
  TimerReset,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatAnswer, formatCorrectAnswer, isAnswerCorrect } from "@/utils/questionType";

const hasUserAnswer = (answer) => (Array.isArray(answer) ? answer.length > 0 : Boolean(answer));

export default function QuizResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all");
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const {
    quiz,
    answers = {},
    score,
    timeSpent = 0,
    mode = "exam",
    timerEnabled = true,
    autoSubmitted = false,
    flaggedQuestions = {},
  } = location.state || {};

  const questionResults = useMemo(() => {
    if (!quiz?.questions) return [];

    return quiz.questions.map((question, idx) => {
      const userAnswer = answers[question.id];
      const answered = hasUserAnswer(userAnswer);
      const correct = answered && isAnswerCorrect(question, userAnswer);
      return {
        question,
        idx,
        userAnswer,
        answered,
        correct,
        flagged: Boolean(flaggedQuestions[question.id]),
      };
    });
  }, [answers, flaggedQuestions, quiz]);

  if (!quiz || !score) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="text-center">
          <p className="text-gray-600">Không có dữ liệu kết quả</p>
          <Button onClick={() => navigate("/quizzes")} className="mt-4 rounded-2xl">
            Về danh sách quiz
          </Button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const normalizedSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(normalizedSeconds / 60);
    const secs = normalizedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (percentage) => {
    if (percentage >= 80) return "bg-emerald-50 border-emerald-200";
    if (percentage >= 60) return "bg-blue-50 border-blue-200";
    if (percentage >= 40) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const timeLimitSeconds = Math.max(1, Math.round((quiz.settings?.timeLimit || 30) * 60));
  const wrongCount = questionResults.filter(item => item.answered && !item.correct).length;
  const unansweredCount = questionResults.filter(item => !item.answered).length;
  const flaggedCount = questionResults.filter(item => item.flagged).length;
  const averageSeconds = score.total ? Math.round(timeSpent / score.total) : 0;
  const filteredQuestionResults = questionResults.filter((item) => {
    if (filter === "correct") return item.correct;
    if (filter === "wrong") return item.answered && !item.correct;
    if (filter === "unanswered") return !item.answered;
    if (filter === "flagged") return item.flagged;
    return true;
  });
  const insight =
    score.percentage >= 80
      ? "Bạn đang nắm bài khá chắc. Nên xem lại các câu sai để khóa thêm điểm."
      : score.percentage >= 60
        ? "Kết quả ổn, nhưng vẫn còn vài lỗ hổng kiến thức nên xử lý ngay."
        : "Nên luyện lại theo từng câu sai và đọc kỹ phần giải thích trước khi làm lại.";

  const filterOptions = [
    { id: "all", label: "Tất cả", count: questionResults.length },
    { id: "correct", label: "Đúng", count: score.correct },
    { id: "wrong", label: "Sai", count: wrongCount },
    { id: "unanswered", label: "Chưa trả lời", count: unansweredCount },
    { id: "flagged", label: "Đã đánh dấu", count: flaggedCount },
  ];

  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const expandFilteredQuestions = () => {
    setExpandedQuestions(new Set(filteredQuestionResults.map(item => item.question.id)));
  };

  const collapseAllQuestions = () => {
    setExpandedQuestions(new Set());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={`mb-8 rounded-[2rem] border-2 shadow-xl ${getScoreBg(score.percentage)}`}>
            <CardContent className="p-8 text-center">
              <Award className={`mx-auto mb-4 h-20 w-20 ${getScoreColor(score.percentage)}`} />
              <h1 className="mb-2 text-4xl font-black text-gray-900">Kết quả của bạn</h1>
              {autoSubmitted && (
                <p className="mb-3 rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
                  Hết giờ, hệ thống đã tự nộp bài
                </p>
              )}
              <p className={`mb-4 text-6xl font-black ${getScoreColor(score.percentage)}`}>
                {score.percentage}%
              </p>
              <p className="mb-6 text-xl text-gray-700">
                {score.correct} / {score.total} câu đúng
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-gray-600">
                <span className="rounded-2xl border border-gray-200 bg-white px-3 py-1 text-sm font-bold text-gray-700">
                  {mode === "practice" ? "Luyện tập" : "Kiểm tra"}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {timerEnabled
                    ? `Thời gian: ${formatTime(timeSpent)} / ${formatTime(timeLimitSeconds)}`
                    : `Thời gian: ${formatTime(timeSpent)} (không giới hạn)`}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            {[
              { label: "Câu đúng", value: score.correct, icon: CheckCircle, color: "border-emerald-100 bg-emerald-50 text-emerald-700" },
              { label: "Câu sai", value: wrongCount, icon: XCircle, color: "border-red-100 bg-red-50 text-red-700" },
              { label: "Chưa trả lời", value: unansweredCount, icon: ListChecks, color: "border-gray-200 bg-gray-50 text-gray-700" },
              { label: "Giây mỗi câu", value: averageSeconds, icon: TimerReset, color: "border-amber-100 bg-amber-50 text-amber-700" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`rounded-2xl border p-4 shadow-sm ${item.color}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-black">{item.label}</span>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-black text-gray-900">{item.value}</p>
                </div>
              );
            })}
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-black text-gray-900">Gợi ý sau bài làm</h2>
              </div>
              <p className="text-sm leading-6 text-gray-700">{insight}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${score.percentage}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-black text-gray-900">Bản đồ câu hỏi</h2>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questionResults.map(item => (
                  <button
                    key={item.question.id}
                    type="button"
                    onClick={() => setFilter(item.correct ? "correct" : item.answered ? "wrong" : "unanswered")}
                    className={`h-9 rounded-xl text-sm font-black ${
                      item.correct
                        ? "bg-emerald-100 text-emerald-700"
                        : item.answered
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.question.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Card className="mb-8 rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl">
            <CardContent className="p-8">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Chi tiết câu trả lời</h2>
                  <p className="mt-1 text-sm text-gray-600">Lọc nhanh để tập trung vào phần cần xem lại.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilter(option.id)}
                      className={`rounded-2xl border px-3 py-2 text-sm font-bold transition ${
                        filter === option.id
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {option.label} ({option.count})
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  onClick={expandFilteredQuestions}
                  variant="outline"
                  className="h-10 rounded-2xl border-gray-300 text-sm font-bold"
                >
                  Mở các câu đang lọc
                </Button>
                <Button
                  type="button"
                  onClick={collapseAllQuestions}
                  variant="outline"
                  className="h-10 rounded-2xl border-gray-300 text-sm font-bold"
                >
                  Thu gọn tất cả
                </Button>
              </div>

              {filteredQuestionResults.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
                  <Target className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="font-bold text-gray-700">Không có câu nào trong bộ lọc này.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredQuestionResults.map(({ question, idx, userAnswer, answered, correct, flagged }) => (
                    <motion.article
                      key={question.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.25) }}
                      className={`rounded-2xl border-2 p-5 ${
                        correct
                          ? "border-emerald-200 bg-emerald-50"
                          : answered
                            ? "border-red-200 bg-red-50"
                            : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleQuestion(question.id)}
                        className="flex w-full items-start gap-3 text-left"
                        data-testid={`result-question-toggle-${question.id}`}
                        aria-expanded={expandedQuestions.has(question.id)}
                      >
                        <span className="mt-1">
                          {correct ? (
                            <CheckCircle className="h-6 w-6 flex-shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className={`h-6 w-6 flex-shrink-0 ${answered ? "text-red-600" : "text-gray-400"}`} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-gray-700">Câu {question.id}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              correct
                                ? "bg-emerald-100 text-emerald-700"
                                : answered
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-200 text-gray-600"
                            }`}>
                              {correct ? "Đúng" : answered ? "Sai" : "Chưa trả lời"}
                            </span>
                            {flagged && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                                <Flag className="h-3 w-3" />
                                Đã đánh dấu
                              </span>
                            )}
                          </span>
                          <span className="block truncate whitespace-pre-line font-medium text-gray-900 md:whitespace-pre-line">
                            {question.question}
                          </span>
                        </span>
                        <span className="mt-1 text-gray-500">
                          {expandedQuestions.has(question.id) ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </span>
                      </button>

                      {expandedQuestions.has(question.id) && (
                        <div className="mt-4 border-t border-white/70 pt-4" data-testid={`result-question-detail-${question.id}`}>
                          <div className="mb-3 whitespace-pre-line rounded-xl bg-white/80 p-3 text-sm text-gray-800">
                            {question.question}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-600">Câu trả lời của bạn: </span>
                              <span className={`font-bold ${correct ? "text-emerald-700" : "text-red-700"}`}>
                                {formatAnswer(userAnswer) || "(Chưa trả lời)"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Đáp án đúng: </span>
                              <span className="font-bold text-emerald-700">{formatCorrectAnswer(question)}</span>
                            </div>
                            {question.explanation && (
                              <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                                <span className="font-bold text-gray-700">Giải thích: </span>
                                <span className="whitespace-pre-line text-gray-700">{question.explanation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              onClick={() => navigate(`/quiz/${id}/take`)}
              className="h-12 flex-1 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Làm lại
            </Button>
            <Button
              onClick={() => navigate("/quizzes")}
              variant="outline"
              className="h-12 flex-1 rounded-2xl border-gray-300 font-bold"
            >
              <Home className="mr-2 h-5 w-5" />
              Về danh sách
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
