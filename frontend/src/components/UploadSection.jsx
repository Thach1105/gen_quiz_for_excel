import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock3, FileSpreadsheet, PlayCircle, Shuffle, Trash2, UploadCloud } from "lucide-react";
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

export default function UploadSection({ onQuestionsLoaded, onCreateQuiz, categories = [] }) {
  const [fileName, setFileName] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [shuffle, setShuffle] = useState(true);
  const [timeLimit, setTimeLimit] = useState(30);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const progress = useMemo(() => (fileName ? 100 : 0), [fileName]);
  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [".xlsx", ".xls", ".csv"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validTypes.includes(fileExt)) {
      setError("Chỉ chấp nhận file Excel (.xlsx, .xls, .csv)");
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setError(null);

    try {
      const response = await uploadExcelFile(file);
      if (response.success) {
        onQuestionsLoaded(response.data.questions);
      }
    } catch (err) {
      setError(err.message || "Lỗi khi upload file");
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setFileName("");
    setError(null);
    onQuestionsLoaded([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateQuiz = () => {
    if (!fileName) {
      setError("Vui lòng upload file Excel trước");
      return;
    }

    onCreateQuiz({
      quizTitle,
      fileName,
      categoryId,
      shuffle,
      timeLimit,
    });
  };

  return (
    <section className="py-12">
      <Card id="upload" className="rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl">
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Upload & Cấu hình</h3>
            <p className="text-sm text-gray-600">
              Tải file Excel và cấu hình thời gian, trộn câu trước khi tạo quiz
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
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
              {uploading ? "Đang xử lý..." : "Kéo thả file Excel vào đây"}
            </p>
            <p className="mb-4 text-sm text-gray-600">
              hoặc nhấp để chọn file (.xlsx, .xls, .csv)
            </p>
            {fileName && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">{fileName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="ml-2 text-gray-400 hover:text-red-600"
                  aria-label="Xóa file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </motion.div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {fileName && progress > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Tiến độ xử lý</span>
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
