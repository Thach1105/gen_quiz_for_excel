import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getQuizById, updateQuiz, uploadQuizImage } from "@/services/api";
import QuestionEditor from "@/components/QuestionEditor";

const getOptionLabel = (index) => String.fromCharCode(65 + index);

const createEmptyOption = (questionIndex, optionIndex) => ({
  id: `option-${Date.now()}-${questionIndex}-${optionIndex}`,
  text: "",
  image: null,
});

const createEmptyQuestion = (questionIndex) => ({
  id: Date.now() + questionIndex,
  question: "",
  options: [createEmptyOption(questionIndex, 0), createEmptyOption(questionIndex, 1)],
  answer: [],
  answerOptionIds: [],
  type: "Single choice",
  explanation: "",
  questionImage: null,
});

const normalizeImage = (image) => {
  if (!image) return null;
  if (typeof image === "string") {
    return image.trim() ? { url: image.trim(), publicId: "" } : null;
  }

  const url = String(image.url || "").trim();
  const publicId = String(image.publicId || "").trim();
  return url ? { url, publicId } : null;
};

const normalizeOption = (option, index) => {
  if (typeof option === "string") {
    return { id: `option-${index + 1}`, text: option, image: null };
  }

  return {
    id: option?.id || `option-${index + 1}`,
    text: option?.text || "",
    image: normalizeImage(option?.image),
  };
};

const normalizeQuestion = (question, index) => {
  const options = Array.isArray(question?.options) ? question.options.map(normalizeOption) : [];
  const answer = Array.isArray(question?.answer) ? question.answer : [];

  return {
    ...question,
    id: question?.id ?? index + 1,
    question: question?.question || "",
    options,
    answer,
    answerOptionIds: Array.isArray(question?.answerOptionIds)
      ? question.answerOptionIds
      : options.filter(option => answer.includes(option.text)).map(option => option.id),
    type: question?.type || "Single choice",
    explanation: question?.explanation || "",
    questionImage: normalizeImage(question?.questionImage),
  };
};

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [savingQuestionId, setSavingQuestionId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadQuiz = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getQuizById(id);
        if (!mounted) return;
        const data = response.data;
        setQuiz({
          ...data,
          questions: Array.isArray(data?.questions) ? data.questions.map(normalizeQuestion) : [],
        });
      } catch (err) {
        if (mounted) setError(err.message || "Không thể tải chi tiết quiz");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadQuiz();
    return () => {
      mounted = false;
    };
  }, [id]);

  const questionCount = useMemo(() => quiz?.questions?.length || 0, [quiz]);
  const questionNavigation = useMemo(
    () => (quiz?.questions || []).map((question, index) => ({ id: question.id, label: index + 1 })),
    [quiz],
  );

  const persistQuestions = async (nextQuestions, savingId = null) => {
    if (!quiz) return;

    try {
      setSavingQuestionId(savingId);
      setError("");
      const response = await updateQuiz(quiz.id || quiz._id || id, { questions: nextQuestions });
      const updatedQuiz = response.data;
      setQuiz({
        ...updatedQuiz,
        questions: Array.isArray(updatedQuiz?.questions) ? updatedQuiz.questions.map(normalizeQuestion) : nextQuestions,
      });
      setEditingQuestionId(null);
    } catch (err) {
      setError(err.message || "Không thể lưu câu hỏi");
      throw err;
    } finally {
      setSavingQuestionId(null);
    }
  };

  const handleSaveQuestion = async (nextQuestion) => {
    if (!quiz) return;
    const nextQuestions = quiz.questions.map((question) => question.id === nextQuestion.id ? nextQuestion : question);
    await persistQuestions(nextQuestions, nextQuestion.id);
  };

  const handleAddQuestion = () => {
    if (!quiz) return;
    const nextQuestion = createEmptyQuestion(quiz.questions.length);
    setQuiz(prev => ({
      ...prev,
      questions: [...(prev?.questions || []), nextQuestion],
    }));
    setEditingQuestionId(nextQuestion.id);
    requestAnimationFrame(() => {
      const element = document.getElementById(`quiz-question-${nextQuestion.id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!quiz) return;
    const nextQuestions = quiz.questions.filter(question => question.id !== questionId);
    await persistQuestions(nextQuestions);
  };

  const scrollToQuestion = (questionId) => {
    const element = document.getElementById(`quiz-question-${questionId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="font-semibold text-gray-700">Đang tải chi tiết quiz...</span>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <Card className="w-full max-w-xl rounded-3xl border-2 border-gray-200 bg-white shadow-xl">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-bold text-gray-900">Không tìm thấy quiz</p>
            <p className="mt-2 text-sm text-gray-600">{error || "Quiz này không tồn tại hoặc đã bị xóa."}</p>
            <Button onClick={() => navigate("/quizzes")} className="mt-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
              Về danh sách quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 py-10">
      <aside className="fixed left-4 top-24 z-30 hidden max-h-[calc(100vh-7rem)] w-64 overflow-y-auto rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur lg:block">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">Danh sách số câu hỏi</h2>
            <p className="text-xs text-gray-600">
              {questionNavigation.length > 0 ? "Chọn số câu để cuộn nhanh." : "Chưa có câu hỏi nào trong quiz."}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{questionCount} câu</span>
        </div>

        {questionNavigation.length > 0 ? (
          <div className="grid grid-cols-5 gap-2">
            {questionNavigation.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToQuestion(item.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-sm font-black text-gray-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Danh sách số câu sẽ hiện ở đây khi quiz có câu hỏi.
          </div>
        )}

        <button
          type="button"
          onClick={handleAddQuestion}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:border-blue-500 hover:bg-blue-100"
        >
          <Plus className="h-4 w-4" />Thêm câu hỏi mới
        </button>
      </aside>

      <div className="mx-auto w-full max-w-screen-2xl px-4 sm:px-6 lg:pl-72 lg:pr-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/quizzes")} className="rounded-2xl border-gray-300 bg-white">
            <ArrowLeft className="mr-2 h-4 w-4" />Quay lại danh sách
          </Button>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => navigate(`/quiz/${quiz.id}/take`)} className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
              Làm bài thử
            </Button>
          </div>
        </div>

        <Card className="mb-6 rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Chi tiết quiz</p>
                <h1 className="mt-2 text-3xl font-black text-gray-900">{quiz.title || "Quiz chưa đặt tên"}</h1>
                <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-gray-600">{quiz.description || "Không có mô tả"}</p>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-2xl font-black text-gray-900">{questionCount}</p>
                  <p className="text-xs font-bold uppercase text-gray-500">Câu hỏi</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-2xl font-black text-gray-900">{quiz.settings?.timeLimit || 30}</p>
                  <p className="text-xs font-bold uppercase text-gray-500">Phút</p>
                </div>
              </div>
            </div>
            {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          </CardContent>
        </Card>

        <Card className="sticky top-0 z-20 mb-6 rounded-[2rem] border border-gray-200 bg-white/90 shadow-lg backdrop-blur lg:hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-gray-900">Điều hướng câu hỏi</h2>
                <p className="text-xs text-gray-600">{questionCount} câu trong quiz này</p>
              </div>
              <Button type="button" variant="outline" onClick={handleAddQuestion} className="rounded-2xl border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                <Plus className="mr-2 h-4 w-4" />Thêm mới
              </Button>
            </div>
            {questionNavigation.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {questionNavigation.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToQuestion(item.id)}
                    className="flex h-10 min-w-10 items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-3 text-sm font-black text-gray-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {(quiz.questions || []).map((question, index) => {
            const editing = editingQuestionId === question.id;
            const saving = savingQuestionId === question.id;
            return (
              <Card key={question.id || index} id={`quiz-question-${question.id}`} className="scroll-mt-28 rounded-[2rem] border-2 border-gray-200 bg-white shadow-lg">
                <CardContent className="p-6">
                  {editing ? (
                    <QuestionEditor
                      question={question}
                      questionIndex={index}
                      saving={saving}
                      onCancel={() => setEditingQuestionId(null)}
                      onSave={handleSaveQuestion}
                      onUploadImage={uploadQuizImage}
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-blue-600">Câu {index + 1}</p>
                          <h2 className="mt-2 whitespace-pre-line text-xl font-black text-gray-900">{question.question || "Câu hỏi mới chưa có nội dung"}</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => setEditingQuestionId(question.id)} className="rounded-2xl border-gray-300 bg-white">
                            <Edit3 className="mr-2 h-4 w-4" />Chỉnh sửa
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="rounded-2xl border-red-300 bg-white text-red-600 hover:bg-red-50"
                            disabled={saving}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Xóa câu hỏi
                          </Button>
                        </div>
                      </div>

                      {question.questionImage?.url && (
                        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-3">
                          <img src={question.questionImage.url} alt={`Question ${index + 1}`} className="max-h-72 rounded-2xl object-contain" />
                        </div>
                      )}

                      <div className="grid gap-3 xl:grid-cols-2">
                        {(question.options || []).map((option, optionIndex) => {
                          const optionText = typeof option === "string" ? option : option.text;
                          const optionImage = typeof option === "string" ? null : normalizeImage(option.image);
                          const correct = (question.answer || []).includes(optionText);
                          return (
                            <div key={option.id || optionIndex} className={`rounded-2xl border p-4 ${correct ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-blue-700">
                                  {getOptionLabel(optionIndex)}
                                </div>
                                <div className="min-w-0 flex-1 space-y-3">
                                  <p className="whitespace-pre-line text-sm font-semibold text-gray-900">{optionText || "Đáp án trống"}</p>
                                  {optionImage?.url && (
                                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-2">
                                      <img src={optionImage.url} alt={`Option ${optionIndex + 1}`} className="max-h-40 rounded-xl object-contain" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-bold uppercase text-gray-500">Loại câu hỏi</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{question.type}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-bold uppercase text-gray-500">Có hình ảnh</p>
                          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <ImageIcon className="h-4 w-4 text-blue-600" />
                            {question.questionImage?.url || (question.options || []).some(option => typeof option !== "string" && option.image?.url) ? "Có" : "Không"}
                          </p>
                        </div>
                      </div>

                      {question.explanation && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          <span className="font-bold">Giải thích: </span>
                          <span className="whitespace-pre-line">{question.explanation}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
