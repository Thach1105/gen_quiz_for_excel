import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, FileText, FileSpreadsheet, PlayCircle, Shuffle, Trash2, UploadCloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadExcelFile } from "@/services/api";

const getCategoryId = (category) => category.id || category._id;

const buildCategoryOptions = (categories = []) => {
  const categoryMap = new Map(categories.map(category => [getCategoryId(category), category]));
  const getPath = (category) => {
    const path = [category.name];
    let parent = categoryMap.get(category.parentId);
    while (parent) {
      path.unshift(parent.name);
      parent = categoryMap.get(parent.parentId);
    }
    return path.join(" > ");
  };

  return categories
    .map(category => ({ id: getCategoryId(category), path: getPath(category) }))
    .sort((a, b) => a.path.localeCompare(b.path, "vi"));
};

const FILE_MODES = {
  excel: {
    label: "Excel",
    accept: ".xlsx,.xls,.csv",
    validTypes: [".xlsx", ".xls", ".csv"],
    emptyError: "Vui lòng upload file Excel trước",
    invalidError: "Chỉ chấp nhận file Excel (.xlsx, .xls, .csv)",
    dropLabel: "Kéo thả file Excel vào đây",
    pickLabel: "hoặc nhấp để chọn file (.xlsx, .xls, .csv)",
    hint: "Tải file Excel và cấu hình thời gian, trộn câu trước khi tạo quiz",
  },
  document: {
    label: "PDF",
    accept: ".pdf",
    validTypes: [".pdf"],
    emptyError: "Vui lòng upload file PDF trước",
    invalidError: "Chỉ chấp nhận file PDF (.pdf)",
    dropLabel: "Kéo thả file PDF vào đây",
    pickLabel: "hoặc nhấp để chọn file (.pdf)",
    hint: "Tải file PDF để Gemini phân tích và tạo preview câu hỏi trước khi lưu quiz",
  },
};

export default function UploadSection({
  onQuestionsLoaded,
  onDocumentImport,
  onCreateQuiz,
  onResetDocumentPreview,
  hasDocumentPreview = false,
  categories = [],
}) {
  const [mode, setMode] = useState("excel");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [quizTitle, setQuizTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [shuffle, setShuffle] = useState(true);
  const [timeLimit, setTimeLimit] = useState(30);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const progress = useMemo(() => (fileName ? 100 : 0), [fileName]);
  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);
  const modeConfig = FILE_MODES[mode];

  const resetSelectedFile = () => {
    setFileName("");
    setSelectedFile(null);
    setError(null);
    onQuestionsLoaded([]);
    onResetDocumentPreview?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    resetSelectedFile();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!modeConfig.validTypes.includes(fileExt)) {
      setError(modeConfig.invalidError);
      return;
    }

    setFileName(file.name);
    setSelectedFile(file);
    setUploading(mode === "excel");
    setError(null);

    if (mode === "document") {
      try {
        await onDocumentImport(file);
      } catch (err) {
        setError(err.message || "Lỗi khi phân tích file PDF");
      } finally {
        setUploading(false);
      }
      return;
    }

    try {
      const response = await uploadExcelFile(file);
      if (response.success) {
        onQuestionsLoaded(response.data.questions);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi upload file");
      setFileName("");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCreateQuiz = () => {
    if (!fileName || !selectedFile) {
      setError(modeConfig.emptyError);
      return;
    }

    onCreateQuiz({
      mode,
      file: selectedFile,
      quizTitle,
      fileName,
      categoryId,
      shuffle,
      timeLimit,
    });
  };

  const FileIcon = mode === "excel" ? FileSpreadsheet : FileText;

  return (
    <section className="py-12">
      <Card id="upload" className="rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Upload & Cấu hình</h3>
            <p className="text-sm text-gray-600">
              {modeConfig.hint}
            </p>
          </div>

          <div className="mb-6 inline-flex rounded-2xl border border-gray-200 bg-gray-100 p-1">
            {Object.entries(FILE_MODES).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleModeChange(key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  mode === key
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={modeConfig.accept}
            onChange={handleFileSelect}
            className="hidden"
          />

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            onClick={handleUploadClick}
            className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50 p-12 transition hover:border-blue-400 hover:bg-blue-100"
          >
            <UploadCloud className="mb-4 h-16 w-16 text-blue-600" />
            <p className="mb-2 text-lg font-bold text-gray-900">
              {uploading ? "Đang xử lý..." : modeConfig.dropLabel}
            </p>
            <p className="mb-4 text-sm text-gray-600">
              {modeConfig.pickLabel}
            </p>
            {fileName && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3">
                <FileIcon className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">{fileName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetSelectedFile();
                  }}
                  className="ml-2 text-gray-400 hover:text-red-600"
                  aria-label="Xóa file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>

          {mode === "document" && hasDocumentPreview && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">Đang xem preview từ AI</p>
                <p className="text-xs text-amber-800">Bạn có thể xóa kết quả hiện tại để chọn PDF khác và chạy lại.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={resetSelectedFile}
                className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa preview để làm lại
              </Button>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {fileName && progress > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">
                  {mode === "excel" ? "Tiến độ xử lý" : "Tệp đã sẵn sàng để xem preview"}
                </span>
                <span className="font-bold text-blue-600">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                />
              </div>
            </div>
          )}

          <div className="mb-6 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <label htmlFor="quiz-title" className="mb-2 block text-sm font-semibold text-gray-900">
                Tên quiz
              </label>
              <input
                id="quiz-title"
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Để trống để hệ thống tự đặt tên"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-2 text-xs text-gray-500">
                Nếu không nhập, tên sẽ được tạo từ tên file hoặc câu hỏi đầu tiên kèm thời gian.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <label htmlFor="quiz-category" className="mb-2 block text-sm font-semibold text-gray-900">
                Nhóm phân loại
              </label>
              <select
                id="quiz-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Chưa phân loại</option>
                {categoryOptions.map(category => (
                  <option key={category.id} value={category.id}>{category.path}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">Có thể đổi nhóm phân loại sau trong danh sách quiz.</p>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <Shuffle className="h-5 w-5 text-gray-700" />
                <span className="text-sm font-semibold text-gray-900">Trộn câu hỏi</span>
              </div>
              <button
                type="button"
                onClick={() => setShuffle(!shuffle)}
                className={`relative h-6 w-11 rounded-full transition ${
                  shuffle ? "bg-blue-600" : "bg-gray-300"
                }`}
                aria-label="Bật tắt trộn câu hỏi"
                data-testid="shuffle-toggle"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    shuffle ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-gray-700" />
                <span className="text-sm font-semibold text-gray-900">Thời gian (phút)</span>
              </div>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 30)}
                min="1"
                max="180"
                className="w-20 rounded-xl border border-gray-300 bg-white px-3 py-1 text-center text-sm font-bold text-gray-900"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateQuiz}
            disabled={!fileName || uploading}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 font-black text-white hover:opacity-90 disabled:opacity-50"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Tạo bài quiz
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
