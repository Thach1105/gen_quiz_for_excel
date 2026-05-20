import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, Download, FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCorrectAnswers, getNormalizedOptions, getQuestionTypeLabel } from "@/utils/questionType";

export default function PreviewSection({ questions = [] }) {
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  const toggleQuestion = (questionId) => {
    const nextExpanded = new Set(expandedQuestions);
    if (nextExpanded.has(questionId)) {
      nextExpanded.delete(questionId);
    } else {
      nextExpanded.add(questionId);
    }
    setExpandedQuestions(nextExpanded);
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(questions.map(q => q.id)));
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  const handleExport = () => {
    if (questions.length === 0) {
      alert("Không có câu hỏi để export");
      return;
    }

    const dataStr = JSON.stringify(questions, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quiz-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getGridCols = (optionCount) => {
    if (optionCount <= 2) return "";
    if (optionCount <= 4) return "sm:grid-cols-2";
    if (optionCount <= 6) return "sm:grid-cols-2 md:grid-cols-3";
    return "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  if (questions.length === 0) {
    return (
      <section className="py-6 lg:py-8">
        <Card id="preview" className="min-h-0 rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl lg:h-[68rem] xl:h-[75rem]">
          <CardContent className="flex h-full flex-col p-6">
            <div className="py-12 text-center">
              <FileQuestion className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h3 className="mb-2 text-xl font-bold text-gray-900">Chưa có câu hỏi</h3>
              <p className="text-gray-600">Upload file Excel hoặc PDF để xem preview câu hỏi</p>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="py-6 lg:py-8">
      <Card id="preview" className="min-h-0 rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl lg:h-[68rem] xl:h-[75rem]">
        <CardContent className="flex h-full flex-col p-6">
          <div className="mb-4 flex flex-shrink-0 flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Preview câu hỏi</h3>
              <p className="text-sm text-gray-600">
                {questions.length} câu hỏi - Click để xem chi tiết
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={expandedQuestions.size === questions.length ? collapseAll : expandAll}
                variant="outline"
                className="rounded-2xl border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                {expandedQuestions.size === questions.length ? "Thu gọn tất cả" : "Mở rộng tất cả"}
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                className="rounded-2xl border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
            </div>
          </div>

          <div data-testid="preview-question-list" className="preview-scroll min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl pr-2">
            {questions.map((item, idx) => {
              const isExpanded = expandedQuestions.has(item.id);
              return (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-2xl border-2 border-gray-200 bg-white transition-colors hover:border-blue-300"
                >
                  <button
                    type="button"
                    onClick={() => toggleQuestion(item.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {item.id || idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 whitespace-pre-line font-medium text-gray-900">{item.question}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">{item.options?.length || 0} đáp án</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{getQuestionTypeLabel(item.type)}</span>
                          {item.explanation && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">Có giải thích</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                          <p className="mb-3 text-sm font-semibold text-gray-700">Câu hỏi:</p>
                          <p className="mb-4 whitespace-pre-line text-gray-900">{item.question}</p>

                          <p className="mb-3 text-sm font-semibold text-gray-700">Đáp án:</p>
                          <div className={`grid gap-2 ${getGridCols(item.options?.length || 0)}`}>
                            {getNormalizedOptions(item.options || []).map((option, optIdx) => {
                              const isCorrect = getCorrectAnswers(item).includes(option.text);
                              return (
                                <div
                                  key={option.id || optIdx}
                                  className={`flex items-center justify-between rounded-xl border-2 p-3 text-sm ${
                                    isCorrect
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                      : "border-gray-200 bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  <span className="whitespace-pre-line">{option.text}</span>
                                  {isCorrect && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />}
                                </div>
                              );
                            })}
                          </div>

                          {item.explanation && (
                            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                              <span className="font-bold">Giải thích: </span>
                              <span className="whitespace-pre-line">{item.explanation}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
