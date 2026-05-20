import React, { useRef, useState } from "react";
import { Check, ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const getOptionLabel = (index) => String.fromCharCode(65 + index);

const EMPTY_IMAGE = { url: "", publicId: "" };

const normalizeImage = (image) => {
  if (!image) return null;
  if (typeof image === "string") {
    return image.trim() ? { url: image.trim(), publicId: "" } : null;
  }

  const url = String(image.url || "").trim();
  const publicId = String(image.publicId || "").trim();
  return url ? { url, publicId } : null;
};

const createEmptyOption = (index) => ({
  id: `option-${Date.now()}-${index}`,
  text: "",
  image: null,
});

export default function QuestionEditor({
  question,
  questionIndex,
  onSave,
  onCancel,
  onUploadImage,
  saving = false,
}) {
  const [draft, setDraft] = useState({
    ...question,
    questionImage: normalizeImage(question.questionImage),
    options: Array.isArray(question.options)
      ? question.options.map((option, index) => typeof option === "string"
        ? { id: `option-${index + 1}`, text: option, image: null }
        : { id: option.id || `option-${index + 1}`, text: option.text || "", image: normalizeImage(option.image) })
      : [createEmptyOption(1), createEmptyOption(2)],
    answerOptionIds: Array.isArray(question.answerOptionIds) ? question.answerOptionIds : [],
    answer: Array.isArray(question.answer) ? question.answer : [],
  });
  const [error, setError] = useState("");
  const [uploadingTarget, setUploadingTarget] = useState("");
  const questionImageInputRef = useRef(null);
  const optionImageInputRefs = useRef({});

  const syncAnswers = (nextOptions, nextAnswerOptionIds) => {
    const answerOptionIdSet = new Set(nextAnswerOptionIds);
    return {
      options: nextOptions,
      answerOptionIds: nextAnswerOptionIds,
      answer: nextOptions.filter(option => answerOptionIdSet.has(option.id)).map(option => option.text).filter(Boolean),
    };
  };

  const updateOption = (optionId, patch) => {
    setDraft((prev) => {
      const nextOptions = prev.options.map((option) => option.id === optionId ? { ...option, ...patch } : option);
      return {
        ...prev,
        ...syncAnswers(nextOptions, prev.answerOptionIds),
      };
    });
  };

  const addOption = () => {
    setDraft((prev) => ({
      ...prev,
      options: [...prev.options, createEmptyOption(prev.options.length + 1)],
    }));
  };

  const removeOption = (optionId) => {
    setDraft((prev) => {
      const nextOptions = prev.options.filter(option => option.id !== optionId);
      const nextAnswerOptionIds = prev.answerOptionIds.filter(id => id !== optionId);
      return {
        ...prev,
        ...syncAnswers(nextOptions, nextAnswerOptionIds),
      };
    });
  };

  const toggleAnswer = (optionId) => {
    setDraft((prev) => {
      const exists = prev.answerOptionIds.includes(optionId);
      const nextAnswerOptionIds = prev.type === "Multiple choice"
        ? (exists ? prev.answerOptionIds.filter(id => id !== optionId) : [...prev.answerOptionIds, optionId])
        : (exists ? [] : [optionId]);

      return {
        ...prev,
        ...syncAnswers(prev.options, nextAnswerOptionIds),
      };
    });
  };

  const handleTypeChange = (nextType) => {
    setDraft((prev) => {
      const nextAnswerOptionIds = nextType === "Multiple choice"
        ? prev.answerOptionIds
        : prev.answerOptionIds.slice(0, 1);
      return {
        ...prev,
        type: nextType,
        ...syncAnswers(prev.options, nextAnswerOptionIds),
      };
    });
  };

  const handleUploadQuestionImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingTarget("question");
      const response = await onUploadImage(file);
      setDraft(prev => ({ ...prev, questionImage: response.data || EMPTY_IMAGE }));
    } catch (err) {
      setError(err.message || "Không thể upload ảnh câu hỏi");
    } finally {
      setUploadingTarget("");
      event.target.value = "";
    }
  };

  const handleUploadOptionImage = async (optionId, file) => {
    if (!file) return;

    try {
      setUploadingTarget(optionId);
      const response = await onUploadImage(file);
      updateOption(optionId, { image: response.data || EMPTY_IMAGE });
    } catch (err) {
      setError(err.message || "Không thể upload ảnh đáp án");
    } finally {
      setUploadingTarget("");
    }
  };

  const clearQuestionImage = () => {
    setDraft(prev => ({ ...prev, questionImage: null }));
  };

  const clearOptionImage = (optionId) => {
    updateOption(optionId, { image: null });
  };

  const handleSubmit = () => {
    const normalizedQuestion = draft.question.trim();
    const normalizedOptions = draft.options.map(option => ({
      id: option.id,
      text: option.text.trim(),
      image: normalizeImage(option.image),
    }));
    const validOptions = normalizedOptions.filter(option => option.text);
    const validOptionIds = new Set(validOptions.map(option => option.id));
    const nextAnswerOptionIds = draft.answerOptionIds.filter(optionId => validOptionIds.has(optionId));
    const uniqueOptionTexts = new Set(validOptions.map(option => option.text.toLowerCase()));

    if (!normalizedQuestion) {
      setError("Nội dung câu hỏi không được để trống");
      return;
    }

    if (validOptions.length < 2) {
      setError("Cần ít nhất 2 đáp án hợp lệ");
      return;
    }

    if (uniqueOptionTexts.size !== validOptions.length) {
      setError("Các đáp án không được trùng nhau");
      return;
    }

    if (nextAnswerOptionIds.length === 0) {
      setError("Cần chọn ít nhất 1 đáp án đúng");
      return;
    }

    if (draft.type === "Single choice" && nextAnswerOptionIds.length !== 1) {
      setError("Câu hỏi một đáp án chỉ được có 1 đáp án đúng");
      return;
    }

    if (nextAnswerOptionIds.some(optionId => !validOptionIds.has(optionId))) {
      setError("Đáp án đúng không khớp với danh sách đáp án hiện tại");
      return;
    }

    setError("");
    onSave({
      ...draft,
      question: normalizedQuestion,
      options: validOptions,
      answerOptionIds: nextAnswerOptionIds,
      answer: validOptions.filter(option => nextAnswerOptionIds.includes(option.id)).map(option => option.text),
      questionImage: normalizeImage(draft.questionImage),
    });
  };

  return (
    <div className="space-y-4 rounded-3xl border border-blue-200 bg-blue-50/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-gray-900">Chỉnh sửa câu {questionIndex + 1}</h3>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl border-gray-300">
            <X className="mr-2 h-4 w-4" />Hủy
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving} className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />{saving ? "Đang lưu..." : "Lưu câu hỏi"}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="block text-sm font-bold text-gray-900">Nội dung câu hỏi</label>
        <textarea
          value={draft.question}
          onChange={(event) => setDraft(prev => ({ ...prev, question: event.target.value }))}
          rows={4}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => questionImageInputRef.current?.click()} className="rounded-xl border-gray-300 bg-white">
            <ImagePlus className="mr-2 h-4 w-4" />{uploadingTarget === "question" ? "Đang upload..." : "Ảnh câu hỏi"}
          </Button>
          <input ref={questionImageInputRef} type="file" accept="image/*" onChange={handleUploadQuestionImage} className="hidden" />
          {draft.questionImage?.url && (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-2">
              <button
                type="button"
                data-testid="remove-question-image"
                onClick={clearQuestionImage}
                className="absolute right-2 top-2 rounded-full border border-red-200 bg-white p-1 text-red-600 shadow-sm hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </button>
              <img src={draft.questionImage.url} alt="Question" className="max-h-40 rounded-xl object-contain" />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <label className="mb-2 block text-sm font-bold text-gray-900">Loại câu hỏi</label>
        <div className="flex gap-2">
          {[
            { value: "Single choice", label: "Single choice" },
            { value: "Multiple choice", label: "Multiple choice" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleTypeChange(item.value)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${draft.type === item.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-bold text-gray-900">Đáp án</label>
          <Button type="button" variant="outline" onClick={addOption} className="rounded-xl border-gray-300 bg-white">
            <Plus className="mr-2 h-4 w-4" />Thêm đáp án
          </Button>
        </div>

        {draft.options.map((option, optionIndex) => {
          const selected = draft.answerOptionIds.includes(option.id);
          return (
            <div key={option.id} className={`rounded-2xl border p-4 ${selected ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
              <div className="mb-3 flex items-start gap-3">
                <button
                  type="button"
                  data-testid={`answer-toggle-${optionIndex}`}
                  onClick={() => toggleAnswer(option.id)}
                  className={`mt-2 flex h-8 w-8 items-center justify-center rounded-full border-2 ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-400"}`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-[72px] w-12 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-base font-black text-blue-700">
                    {getOptionLabel(optionIndex)}
                  </div>
                  <textarea
                    value={option.text}
                    onChange={(event) => updateOption(option.id, { text: event.target.value })}
                    rows={2}
                    placeholder="Nhập nội dung đáp án"
                    className="min-h-[72px] flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                  />
                </div>
                <button type="button" onClick={() => removeOption(option.id)} className="rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-3 text-xs font-semibold text-gray-500">Đáp án {getOptionLabel(optionIndex)} được hệ thống đánh số tự động.</p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => optionImageInputRefs.current[option.id]?.click()}
                  className="rounded-xl border-gray-300 bg-white"
                >
                  <ImagePlus className="mr-2 h-4 w-4" />{uploadingTarget === option.id ? "Đang upload..." : "Ảnh đáp án"}
                </Button>
                <input
                  ref={(element) => {
                    optionImageInputRefs.current[option.id] = element;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    handleUploadOptionImage(option.id, file);
                    event.target.value = "";
                  }}
                />
                {option.image?.url && (
                  <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-2">
                    <button
                      type="button"
                      data-testid={`remove-option-image-${optionIndex}`}
                      onClick={() => clearOptionImage(option.id)}
                      className="absolute right-2 top-2 rounded-full border border-red-200 bg-white p-1 text-red-600 shadow-sm hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <img src={option.image.url} alt={`Option ${optionIndex + 1}`} className="max-h-32 rounded-xl object-contain" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
        <label className="block text-sm font-bold text-gray-900">Giải thích</label>
        <textarea
          value={draft.explanation || ""}
          onChange={(event) => setDraft(prev => ({ ...prev, explanation: event.target.value }))}
          rows={3}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
