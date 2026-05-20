import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Infinity,
  ListChecks,
  Square,
  Target,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getQuizById } from "@/services/api";
import {
  formatCorrectAnswer,
  getAnswerSelectionKey,
  getCorrectAnswers,
  getNormalizedOptions,
  getOptionImage,
  getOptionText,
  getQuestionImage,
  isAnswerCorrect,
  isMultipleChoice,
} from "@/utils/questionType";

const DEFAULT_TIME_LIMIT_MINUTES = 30;

const getTimeLimitSeconds = (quiz) =>
  Math.max(1, Math.round((quiz?.settings?.timeLimit || DEFAULT_TIME_LIMIT_MINUTES) * 60));

export default function QuizTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [selectedMode, setSelectedMode] = useState("exam");
  const [practiceTimerEnabled, setPracticeTimerEnabled] = useState(true);
  const [revealedQuestions, setRevealedQuestions] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(null);

  const timeLimitSeconds = useMemo(() => getTimeLimitSeconds(quiz), [quiz]);
  const timerEnabled = selectedMode === "exam" || practiceTimerEnabled;

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  useEffect(() => {
    if (!started || !timerEnabled || submitted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit({ autoSubmitted: true, elapsedSeconds: timeLimitSeconds });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, timerEnabled, submitted, timeLimitSeconds, answers, selectedMode, quiz, startedAt, flaggedQuestions]);

  const fetchQuiz = async () => {
    try {
      const response = await getQuizById(id);
      if (response.success) {
        setQuiz(response.data);
        setTimeLeft(getTimeLimitSeconds(response.data));
      }
    } catch (err) {
      alert("Lỗi khi tải quiz: " + err.message);
      navigate("/quizzes");
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach(q => {
      if (isAnswerCorrect(q, answers[q.id])) {
        correct++;
      }
    });

    return {
      correct,
      total: quiz.questions.length,
      percentage: Math.round((correct / quiz.questions.length) * 100),
    };
  };

  const getElapsedSeconds = (overrideSeconds) => {
    if (typeof overrideSeconds === "number") return overrideSeconds;
    if (!startedAt) return 0;
    return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  };

  const handleStart = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setRevealedQuestions({});
    setFlaggedQuestions({});
    setSubmitted(false);
    setStartedAt(Date.now());
    setTimeLeft(timeLimitSeconds);
    setStarted(true);
  };

  const handleSubmit = ({ autoSubmitted = false, elapsedSeconds } = {}) => {
    if (!quiz || submitted) return;

    setSubmitted(true);
    const score = calculateScore();
    navigate(`/quiz/${id}/result`, {
      state: {
        quiz,
        answers,
        score,
        mode: selectedMode,
        timerEnabled,
        autoSubmitted,
        timeSpent: getElapsedSeconds(elapsedSeconds),
        flaggedQuestions,
      },
    });
  };

  const handleAnswer = (question, option, optionIndex, isMultiple) => {
    const questionId = question.id;
    if (selectedMode === "practice" && revealedQuestions[questionId]) return;

    const optionValue = getOptionValue(question, option, optionIndex);

    if (isMultiple) {
      setAnswers(prev => {
        const currentArray = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        const nextAnswer = currentArray.includes(optionValue)
          ? currentArray.filter(value => value !== optionValue)
          : [...currentArray, optionValue];

        return {
          ...prev,
          [questionId]: nextAnswer,
        };
      });
      return;
    }

    setAnswers(prev => ({
      ...prev,
      [questionId]: optionValue,
    }));
  };

  const handleRevealAnswer = (questionId) => {
    if (!hasAnswered(questionId)) return;
    setRevealedQuestions(prev => ({
      ...prev,
      [questionId]: true,
    }));
  };

  const handleToggleFlag = (questionId) => {
    setFlaggedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const scrollToQuestion = (index) => {
    const targetQuestion = quiz.questions[index];
    if (!targetQuestion) return;

    setCurrentQuestion(index);
    document.getElementById(`question-${targetQuestion.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleJumpToNextUnanswered = () => {
    const nextIndex = quiz.questions.findIndex(item => !hasAnswered(item.id));
    if (nextIndex >= 0) {
      scrollToQuestion(nextIndex);
    }
  };

  const formatTime = (seconds) => {
    const normalizedSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(normalizedSeconds / 60);
    const secs = normalizedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hasAnswered = (questionId) => {
    const answer = answers[questionId];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
  };

  const isOptionSelected = (question, option, optionIndex, isMultiple) => {
    const answer = answers[question.id];
    const selectionKey = getAnswerSelectionKey(question, option, optionIndex);
    return isMultiple
      ? Array.isArray(answer) && answer.includes(selectionKey)
      : answer === selectionKey;
  };

  const getOptionValue = (question, option, optionIndex) => getAnswerSelectionKey(question, option, optionIndex);

  const getDisplayCorrectAnswers = (question) => getCorrectAnswers(question);

  const getQuestionOptions = (question) => getNormalizedOptions(question.options || []);

  const getQuestionStatus = (questionId, index) => {
    if (index === currentQuestion) return "current";
    if (revealedQuestions[questionId]) return "revealed";
    if (flaggedQuestions[questionId]) return "flagged";
    if (hasAnswered(questionId)) return "answered";
    return "unanswered";
  };

  const getNavButtonClass = (status) => {
    const base = "h-10 w-10 rounded-xl border-2 text-sm font-bold transition";
    const classes = {
      current: "border-blue-600 bg-blue-600 text-white shadow-sm",
      revealed: "border-amber-400 bg-amber-50 text-amber-800",
      flagged: "border-rose-300 bg-rose-50 text-rose-700",
      answered: "border-emerald-300 bg-emerald-50 text-emerald-700",
      unanswered: "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
    };
    return `${base} ${classes[status]}`;
  };

  const getOptionClass = (option, isSelected, isRevealed, correctAnswers) => {
    if (isRevealed && correctAnswers.includes(option)) {
      return "border-emerald-500 bg-emerald-50 text-emerald-900";
    }
    if (isRevealed && isSelected) {
      return "border-red-400 bg-red-50 text-red-900";
    }
    if (isSelected) {
      return "border-blue-600 bg-blue-50 text-blue-900";
    }
    return "border-gray-200 bg-white text-gray-700 hover:border-gray-300";
  };

  const quizQuestions = quiz?.questions || [];
  const answeredCount = quizQuestions.filter(item => hasAnswered(item.id)).length;
  const revealedCount = quizQuestions.filter(item => revealedQuestions[item.id]).length;
  const flaggedCount = quizQuestions.filter(item => flaggedQuestions[item.id]).length;
  const unansweredCount = Math.max(0, quizQuestions.length - answeredCount);
  const progressPercent = quizQuestions.length ? Math.round((answeredCount / quizQuestions.length) * 100) : 0;
  const multipleChoiceCount = quizQuestions.filter(item => isMultipleChoice(item.type)).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Đang tải quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <p className="text-gray-600">Không tìm thấy quiz</p>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-10">
        <Card className="w-full max-w-3xl rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl">
          <CardContent className="p-8">
            <div className="text-center">
              <h1 className="mb-4 text-3xl font-black text-gray-900">{quiz.title}</h1>
              <p className="mb-6 text-gray-600">{quiz.description}</p>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-4 text-center">
                <p className="text-sm font-bold text-blue-700">Số câu hỏi</p>
                <p className="text-2xl font-black text-gray-900">{quiz.questions.length}</p>
              </div>
              <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-4 text-center">
                <p className="text-sm font-bold text-emerald-700">Thời gian</p>
                <p className="text-2xl font-black text-gray-900">{quiz.settings?.timeLimit || 30} phút</p>
              </div>
              <div className="rounded-2xl border-2 border-purple-100 bg-purple-50 p-4 text-center">
                <p className="text-sm font-bold text-purple-700">Câu nhiều đáp án</p>
                <p className="text-2xl font-black text-gray-900">{multipleChoiceCount}</p>
              </div>
              <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-center">
                <p className="text-sm font-bold text-amber-700">Có giải thích</p>
                <p className="text-2xl font-black text-gray-900">{quiz.questions.filter(item => item.explanation).length}</p>
              </div>
            </div>

            <div className="mb-8 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <ListChecks className="mb-2 h-5 w-5 text-blue-600" />
                <p className="text-sm font-bold text-gray-900">Bảng câu hỏi</p>
                <p className="mt-1 text-xs text-gray-600">Theo dõi câu đã làm, chưa làm và câu cần xem lại.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Flag className="mb-2 h-5 w-5 text-rose-600" />
                <p className="text-sm font-bold text-gray-900">Đánh dấu xem lại</p>
                <p className="mt-1 text-xs text-gray-600">Ghim các câu còn phân vân để quay lại nhanh.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Target className="mb-2 h-5 w-5 text-emerald-600" />
                <p className="text-sm font-bold text-gray-900">Tiến độ trực quan</p>
                <p className="mt-1 text-xs text-gray-600">Xem tỷ lệ hoàn thành và số câu còn lại trong lúc làm.</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-sm font-bold text-gray-700">Chọn chế độ làm bài</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedMode("exam")}
                  data-testid="mode-exam"
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    selectedMode === "exam"
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="font-black">Kiểm tra</div>
                  <div className="mt-1 text-sm text-gray-600">Nộp bài xong mới xem kết quả và đáp án đúng.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode("practice")}
                  data-testid="mode-practice"
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    selectedMode === "practice"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="font-black">Luyện tập</div>
                  <div className="mt-1 text-sm text-gray-600">Có thể xem đáp án đúng và giải thích ở từng câu.</div>
                </button>
              </div>
            </div>

            {selectedMode === "practice" && (
              <button
                type="button"
                onClick={() => setPracticeTimerEnabled(prev => !prev)}
                data-testid="practice-timer-toggle"
                className="mb-6 flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left"
              >
                <div>
                  <p className="font-bold text-gray-900">Tính giờ khi luyện tập</p>
                  <p className="text-sm text-gray-600">
                    {practiceTimerEnabled ? "Hết giờ sẽ tự nộp bài." : "Không giới hạn thời gian luyện tập."}
                  </p>
                </div>
                <div className={`h-7 w-12 rounded-full p-1 transition ${practiceTimerEnabled ? "bg-blue-600" : "bg-gray-300"}`}>
                  <div className={`h-5 w-5 rounded-full bg-white transition ${practiceTimerEnabled ? "translate-x-5" : ""}`} />
                </div>
              </button>
            )}

            <Button
              onClick={handleStart}
              className="h-12 w-full rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700"
            >
              Bắt đầu làm bài
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <aside className="fixed left-4 top-24 z-30 hidden max-h-[calc(100vh-7rem)] w-64 overflow-y-auto rounded-3xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur lg:block">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase text-gray-600">Câu hỏi</span>
          <span className="text-xs font-bold text-blue-700">{answeredCount}/{quiz.questions.length}</span>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-5 gap-2">
          {quiz.questions.map((item, idx) => {
            const status = getQuestionStatus(item.id, idx);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToQuestion(idx)}
                className={getNavButtonClass(status)}
                data-testid={`question-nav-${item.id}`}
                data-status={status}
                aria-label={`Câu ${item.id}`}
                title={`Câu ${item.id}`}
              >
                {item.id}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="relative z-10 max-w-none px-4 py-6 sm:px-6 lg:pl-72 lg:pr-8">
        <div className="sticky top-0 z-20 mb-6 rounded-[2rem] border border-gray-200 bg-white/90 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate("/quizzes")}
                variant="outline"
                className="rounded-2xl border-gray-300"
              >
                Thoát
              </Button>
              <div>
                <p className="text-sm font-bold text-gray-700">{answeredCount}/{quiz.questions.length} câu đã làm</p>
                <div className="mt-1 h-2 w-48 rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-2xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">
                {selectedMode === "exam" ? "Kiểm tra" : "Luyện tập"}
              </span>
              <span className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700">
                Cần xem lại: {flaggedCount}
              </span>
              <Button
                type="button"
                onClick={handleJumpToNextUnanswered}
                disabled={unansweredCount === 0}
                variant="outline"
                className="rounded-2xl border-gray-300 text-sm font-bold disabled:opacity-50"
              >
                <Target className="mr-2 h-4 w-4" />
                Câu chưa làm tiếp theo
              </Button>
              <div className="flex items-center gap-2 rounded-2xl border-2 border-gray-200 bg-white px-4 py-2">
                {timerEnabled ? (
                  <>
                    <Clock className="h-5 w-5 text-gray-600" />
                    <span className="font-bold text-gray-900" data-testid="timer-display">{formatTime(timeLeft)}</span>
                  </>
                ) : (
                  <>
                    <Infinity className="h-5 w-5 text-gray-600" />
                    <span className="font-bold text-gray-900" data-testid="timer-display">Không giới hạn</span>
                  </>
                )}
              </div>
              <Button
                onClick={() => handleSubmit()}
                data-testid="submit-quiz"
                className="rounded-2xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                Nộp bài
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {quiz.questions.map((item, idx) => {
              const status = getQuestionStatus(item.id, idx);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToQuestion(idx)}
                  className={`${getNavButtonClass(status)} shrink-0`}
                  data-testid={`question-nav-${item.id}`}
                  data-status={status}
                  aria-label={`Câu ${item.id}`}
                >
                  {item.id}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-blue-700">Hoàn thành</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className="text-2xl font-black text-gray-900">{progressPercent}%</p>
              <p className="text-sm font-bold text-gray-500">{answeredCount}/{quiz.questions.length}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-gray-500">Chưa làm</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{unansweredCount}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-rose-700">Cần xem lại</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{flaggedCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase text-amber-700">Đã xem đáp án</p>
            <p className="mt-2 text-2xl font-black text-gray-900">{revealedCount}</p>
          </div>
        </div>

        <div className="space-y-6">
          {quiz.questions.map((question, idx) => {
            const isMultiple = isMultipleChoice(question.type);
            const isRevealed = Boolean(revealedQuestions[question.id]);
            const questionAnswered = hasAnswered(question.id);
            const correctAnswers = getDisplayCorrectAnswers(question);
            const currentAnswerCorrect = isAnswerCorrect(question, answers[question.id]);
            const questionImage = getQuestionImage(question);
            const normalizedOptions = getQuestionOptions(question);

            return (
              <motion.section
                key={question.id}
                id={`question-${question.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                className="scroll-mt-32"
                onFocus={() => setCurrentQuestion(idx)}
              >
                <Card className="rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl">
                  <CardContent className="p-6 lg:p-8">
                    <div className="mb-6 border-b border-gray-100 pb-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2">
                          <span className="text-sm font-bold text-blue-700">Câu {question.id}</span>
                        </div>
                        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
                          isMultiple ? "bg-purple-100" : "bg-emerald-100"
                        }`}>
                          <span className={`text-xs font-bold ${
                            isMultiple ? "text-purple-700" : "text-emerald-700"
                          }`}>
                            {isMultiple ? "Chọn nhiều đáp án" : "Chọn 1 đáp án"}
                          </span>
                        </div>
                        {isRevealed && (
                          <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700">
                            Đã xem đáp án
                          </span>
                        )}
                        {flaggedQuestions[question.id] && (
                          <span className="rounded-full bg-rose-100 px-4 py-2 text-xs font-bold text-rose-700">
                            Cần xem lại
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <h2 className="whitespace-pre-line text-2xl font-bold leading-relaxed text-gray-900">{question.question}</h2>
                        <Button
                          type="button"
                          onClick={() => handleToggleFlag(question.id)}
                          variant="outline"
                          className={`shrink-0 rounded-2xl border-gray-300 ${
                            flaggedQuestions[question.id] ? "border-rose-300 bg-rose-50 text-rose-700" : "bg-white"
                          }`}
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          {flaggedQuestions[question.id] ? "Bỏ đánh dấu" : "Xem lại"}
                        </Button>
                      </div>
                      {questionImage?.url && (
                        <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-3">
                          <img src={questionImage.url} alt={`Question ${question.id}`} className="max-h-72 rounded-2xl object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {normalizedOptions.map((option, optionIndex) => {
                        const optionText = getOptionText(option.raw);
                        const optionImage = getOptionImage(option.raw);
                        const isSelected = isOptionSelected(question, option.raw, optionIndex, isMultiple);
                        const isLocked = selectedMode === "practice" && isRevealed;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            disabled={isLocked}
                            data-testid={`option-${question.id}-${optionIndex}`}
                            data-selected={isSelected ? "true" : "false"}
                            data-correct={correctAnswers.includes(optionText) ? "true" : "false"}
                            onClick={() => handleAnswer(question, option.raw, optionIndex, isMultiple)}
                            className={`w-full rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed ${getOptionClass(
                              optionText,
                              isSelected,
                              isRevealed,
                              correctAnswers
                            )}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-3">
                                <span className="block whitespace-pre-line font-medium">{optionText}</span>
                                {optionImage?.url && (
                                  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2">
                                    <img src={optionImage.url} alt={`Option ${optionIndex + 1}`} className="max-h-40 rounded-xl object-contain" />
                                  </div>
                                )}
                              </div>
                              {isMultiple ? (
                                isSelected ? (
                                  <CheckSquare className="h-5 w-5 flex-shrink-0 text-blue-600" />
                                ) : (
                                  <Square className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                )
                              ) : (
                                isSelected && <CheckCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedMode === "practice" && (
                      <div className="mt-5">
                        <Button
                          onClick={() => handleRevealAnswer(question.id)}
                          disabled={!questionAnswered || isRevealed}
                          variant="outline"
                          data-testid="show-answer-button"
                          className="rounded-2xl border-gray-300 bg-white"
                        >
                          <Eye className="mr-2 h-5 w-5" />
                          {isRevealed ? "Đã hiển thị đáp án" : "Xem đáp án đúng"}
                        </Button>
                      </div>
                    )}

                    {selectedMode === "practice" && isRevealed && (
                      <div
                        className={`mt-5 rounded-2xl border-2 p-4 ${
                          currentAnswerCorrect ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                        }`}
                        data-testid="practice-feedback"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          {currentAnswerCorrect ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className={`font-bold ${currentAnswerCorrect ? "text-emerald-700" : "text-red-700"}`}>
                            {currentAnswerCorrect ? "Bạn đã chọn đúng" : "Bạn chưa chọn đúng"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          Đáp án đúng: <span className="whitespace-pre-line font-bold text-emerald-700">{formatCorrectAnswer(question)}</span>
                        </p>
                        {question.explanation && (
                          <p className="mt-2 text-sm text-gray-700">
                            Giải thích: <span className="whitespace-pre-line font-medium">{question.explanation}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
