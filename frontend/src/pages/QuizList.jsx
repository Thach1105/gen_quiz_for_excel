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
  FolderTree,
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
import { createCategory, deleteCategory, deleteQuiz, getAllCategories, getAllQuizzes, updateCategory, updateQuiz } from "@/services/api";
import { isMultipleChoice } from "@/utils/questionType";

const getQuizId = (quiz) => quiz.id || quiz._id;
const getCategoryId = (category) => category.id || category._id;

const buildCategoryHelpers = (categories = []) => {
  const categoryMap = new Map(categories.map(category => [getCategoryId(category), category]));
  const childrenMap = new Map();
  categories.forEach(category => {
    const parentId = category.parentId || "root";
    childrenMap.set(parentId, [...(childrenMap.get(parentId) || []), category]);
  });
  childrenMap.forEach(children => children.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi")));

  const getCategoryPath = (categoryId) => {
    if (!categoryId) return "Chưa phân loại";
    const category = categoryMap.get(categoryId);
    if (!category) return "Chưa phân loại";
    const path = [category.name];
    let parent = categoryMap.get(category.parentId);
    while (parent) {
      path.unshift(parent.name);
      parent = categoryMap.get(parent.parentId);
    }
    return path.join(" > ");
  };

  const getDescendantIds = (categoryId) => {
    const ids = [categoryId];
    for (const child of childrenMap.get(categoryId) || []) {
      ids.push(...getDescendantIds(getCategoryId(child)));
    }
    return ids;
  };

  const categoryOptions = categories
    .map(category => ({ id: getCategoryId(category), path: getCategoryPath(getCategoryId(category)) }))
    .sort((a, b) => a.path.localeCompare(b.path, "vi"));

  return { childrenMap, getCategoryPath, getDescendantIds, categoryOptions };
};

const formatDate = (value) => {
  if (!value) return "Chưa rõ ngày";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa rõ ngày";
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
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
  const [categories, setCategories] = useState([]);
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
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const [categoryError, setCategoryError] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryParentId, setEditingCategoryParentId] = useState("");
  const [savingQuizCategoryId, setSavingQuizCategoryId] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const [quizResponse, categoryResponse] = await Promise.all([getAllQuizzes(100, 0), getAllCategories()]);
      if (quizResponse.success) setQuizzes(quizResponse.data);
      if (categoryResponse.success) setCategories(categoryResponse.data);
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

  const { childrenMap, getCategoryPath, getDescendantIds, categoryOptions } = useMemo(() => buildCategoryHelpers(categories), [categories]);

  const quizzesByCategory = useMemo(() => {
    const grouped = new Map();
    quizzes.forEach(quiz => {
      const categoryId = quiz.categoryId || "uncategorized";
      grouped.set(categoryId, [...(grouped.get(categoryId) || []), quiz]);
    });
    return grouped;
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const descendantIds = selectedCategoryId !== "all" && selectedCategoryId !== "uncategorized"
      ? new Set(getDescendantIds(selectedCategoryId))
      : null;

    const matched = quizzes.filter((quiz) => {
      const quizCategoryId = quiz.categoryId || null;
      const matchesCategory = selectedCategoryId === "all"
        || (selectedCategoryId === "uncategorized" ? !quizCategoryId : descendantIds.has(quizCategoryId));
      if (!matchesCategory) return false;
      if (!normalizedSearch) return true;
      const text = [quiz.title, quiz.description, getCategoryPath(quiz.categoryId), ...(quiz.questions || []).map(question => question.question)]
        .join(" ")
        .toLowerCase();
      return text.includes(normalizedSearch);
    });

    return [...matched].sort((a, b) => {
      if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""), "vi");
      if (sortBy === "questions") return getQuizMetrics(b).questionCount - getQuizMetrics(a).questionCount;
      if (sortBy === "time") return getQuizMetrics(b).timeLimit - getQuizMetrics(a).timeLimit;
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [getCategoryPath, getDescendantIds, quizzes, searchTerm, selectedCategoryId, sortBy]);

  const handleDelete = async (id) => {
    if (!confirm("Đồng ý xóa quiz này?")) return;
    try {
      await deleteQuiz(id);
      setQuizzes(prev => prev.filter(q => getQuizId(q) !== id));
    } catch (err) {
      alert("Lỗi khi xóa quiz: " + err.message);
    }
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
      setQuizzes(prev => prev.map(quiz => getQuizId(quiz) === id ? { ...quiz, title: updatedQuiz?.title || nextTitle, updatedAt: updatedQuiz?.updatedAt || quiz.updatedAt } : quiz));
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
    if (event.key === "Escape") cancelRename();
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
    const nextSettings = { ...(quiz.settings || {}), timeLimit: nextTimeLimit };
    try {
      setSavingTimeId(quizId);
      setTimeEditError(null);
      const response = await updateQuiz(quizId, { settings: nextSettings });
      const updatedQuiz = response.data;
      setQuizzes(prev => prev.map(item => getQuizId(item) === quizId ? { ...item, settings: updatedQuiz?.settings || nextSettings, updatedAt: updatedQuiz?.updatedAt || item.updatedAt } : item));
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
    if (event.key === "Escape") cancelEditTime();
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Tên nhóm không được để trống");
      return;
    }
    try {
      setCategoryError(null);
      const response = await createCategory({ name, parentId: newCategoryParentId || null });
      if (response.success) {
        setCategories(prev => [...prev, response.data]);
        setNewCategoryName("");
        setNewCategoryParentId("");
      }
    } catch (err) {
      setCategoryError(err.message || "Không thể tạo nhóm phân loại");
    }
  };

  const startEditCategory = (category) => {
    setEditingCategoryId(getCategoryId(category));
    setEditingCategoryName(category.name || "");
    setEditingCategoryParentId(category.parentId || "");
    setCategoryError(null);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategoryParentId("");
  };

  const handleSaveCategory = async (categoryId) => {
    const name = editingCategoryName.trim();
    if (!name) {
      setCategoryError("Tên nhóm không được để trống");
      return;
    }
    try {
      setCategoryError(null);
      const response = await updateCategory(categoryId, { name, parentId: editingCategoryParentId || null });
      setCategories(prev => prev.map(category => getCategoryId(category) === categoryId ? response.data : category));
      cancelEditCategory();
    } catch (err) {
      setCategoryError(err.message || "Không thể cập nhật nhóm phân loại");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Xóa nhóm này? Quiz trong nhóm sẽ chuyển về chưa phân loại.")) return;
    try {
      setCategoryError(null);
      await deleteCategory(categoryId);
      setCategories(prev => prev.filter(category => getCategoryId(category) !== categoryId).map(category => category.parentId === categoryId ? { ...category, parentId: null } : category));
      setQuizzes(prev => prev.map(quiz => quiz.categoryId === categoryId ? { ...quiz, categoryId: null } : quiz));
      if (selectedCategoryId === categoryId) setSelectedCategoryId("all");
    } catch (err) {
      setCategoryError(err.message || "Không thể xóa nhóm phân loại");
    }
  };

  const handleUpdateQuizCategory = async (quiz, nextCategoryId) => {
    const quizId = getQuizId(quiz);
    try {
      setSavingQuizCategoryId(quizId);
      const response = await updateQuiz(quizId, { categoryId: nextCategoryId || null });
      const updatedQuiz = response.data;
      setQuizzes(prev => prev.map(item => getQuizId(item) === quizId ? { ...item, categoryId: updatedQuiz?.categoryId || nextCategoryId || null, updatedAt: updatedQuiz?.updatedAt || item.updatedAt } : item));
    } catch (err) {
      alert("Không thể cập nhật nhóm quiz: " + err.message);
    } finally {
      setSavingQuizCategoryId(null);
    }
  };

  const renderCategoryNode = (category, level = 0) => {
    const categoryId = getCategoryId(category);
    const isSelected = selectedCategoryId === categoryId;
    const isEditing = editingCategoryId === categoryId;
    const nodeQuizzes = quizzesByCategory.get(categoryId) || [];
    const children = childrenMap.get(categoryId) || [];
    const parentOptions = categoryOptions.filter(option => option.id !== categoryId);

    return (
      <div key={categoryId} className="relative" data-testid={`category-node-${categoryId}`}>
        {level > 0 && <span className="absolute -left-3 top-0 h-full w-px bg-blue-100" />}
        <div className="relative mb-2" style={{ marginLeft: level ? `${level * 16}px` : 0 }}>
          {level > 0 && <span className="absolute -left-3 top-6 h-px w-3 bg-blue-100" />}
          <div className={`rounded-2xl border p-2 shadow-sm transition ${isSelected ? "border-blue-200 bg-blue-50 shadow-blue-100" : "border-gray-100 bg-white hover:border-blue-100 hover:shadow-md"}`}>
            {isEditing ? (
              <div className="space-y-2 rounded-xl bg-white p-1">
                <input value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-blue-500" data-testid={`category-edit-name-${categoryId}`} />
                <select value={editingCategoryParentId} onChange={(event) => setEditingCategoryParentId(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 outline-none" data-testid={`category-edit-parent-${categoryId}`}>
                  <option value="">Không có nhóm cha</option>
                  {parentOptions.map(option => <option key={option.id} value={option.id}>{option.path}</option>)}
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleSaveCategory(categoryId)} className="flex-1 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700" data-testid={`category-save-${categoryId}`}>Lưu</button>
                  <button type="button" onClick={cancelEditCategory} className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-600">Hủy</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setSelectedCategoryId(categoryId)} className={`group min-w-0 flex-1 rounded-xl px-3 py-2 text-left transition ${isSelected ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-100" : "bg-gradient-to-r from-gray-50 to-white text-gray-800 hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700"}`}>
                    <span className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white"}`}>
                        {children.length ? "▦" : "▣"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black">{category.name}</span>
                        <span className={isSelected ? "text-xs font-bold text-blue-100" : "text-xs font-bold text-gray-500"}>{children.length} nhóm con</span>
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black ${isSelected ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>{nodeQuizzes.length}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => startEditCategory(category)} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" aria-label="Sửa nhóm"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => handleDeleteCategory(categoryId)} className="rounded-xl border border-red-100 bg-white p-2 text-red-500 shadow-sm hover:bg-red-50" aria-label="Xóa nhóm"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {nodeQuizzes.length > 0 && (
                  <div className="mt-2 space-y-1 border-l-2 border-dashed border-blue-100 pl-3">
                    {nodeQuizzes.slice(0, 5).map(quiz => (
                      <button key={getQuizId(quiz)} type="button" onClick={() => { setSelectedCategoryId(categoryId); setSearchTerm(quiz.title || ""); }} className="group flex w-full items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-left text-xs font-bold text-gray-600 transition hover:bg-blue-50 hover:text-blue-700">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300 group-hover:bg-blue-600" />
                        <span className="truncate">{quiz.title || "Quiz chưa đặt tên"}</span>
                      </button>
                    ))}
                    {nodeQuizzes.length > 5 && <p className="px-2 text-xs font-bold text-gray-400">+{nodeQuizzes.length - 5} quiz khác</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {children.map(child => renderCategoryNode(child, level + 1))}
      </div>
    );
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

  const rootCategories = childrenMap.get("root") || [];
  const uncategorizedQuizzes = quizzesByCategory.get("uncategorized") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-bold text-blue-700 shadow-sm"><Sparkles className="h-4 w-4" />Không gian quản lý quiz</div>
            <h1 className="text-4xl font-black text-gray-900">Danh sách Quiz</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Tìm nhanh, xem cấu trúc câu hỏi, copy link chia sẻ và bắt đầu làm bài từ một nơi.</p>
          </div>
          <Button onClick={() => navigate("/")} className="h-12 rounded-2xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"><Plus className="mr-2 h-5 w-5" />Tạo quiz mới</Button>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Bộ quiz", value: dashboard.totalQuizzes, icon: FileQuestion, color: "text-blue-700 bg-blue-50 border-blue-100" },
            { label: "Tổng câu hỏi", value: dashboard.totalQuestions, icon: ListChecks, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
            { label: "Phút trung bình", value: dashboard.averageMinutes, icon: Clock, color: "text-amber-700 bg-amber-50 border-amber-100" },
            { label: "Có giải thích", value: dashboard.withExplanation, icon: CheckCircle2, color: "text-rose-700 bg-rose-50 border-rose-100" },
          ].map(item => {
            const Icon = item.icon;
            return <div key={item.label} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.color}`}><div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold">{item.label}</span><Icon className="h-5 w-5" /></div><p className="text-3xl font-black text-gray-900">{item.value}</p></div>;
          })}
        </div>

        <div className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto_auto]">
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"><Search className="h-5 w-5 text-gray-500" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm theo tên, mô tả, nhóm phân loại hoặc nội dung câu hỏi" className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400" /></label>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-700 outline-none"><option value="latest">Mới cập nhật</option><option value="title">Tên A-Z</option><option value="questions">Nhiều câu hỏi</option><option value="time">Thời gian dài</option></select>
          <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button type="button" onClick={() => setViewMode("grid")} className={`flex h-9 items-center justify-center rounded-lg px-3 text-sm font-bold ${viewMode === "grid" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`} aria-label="Hiển thị dạng lưới"><LayoutGrid className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode("compact")} className={`flex h-9 items-center justify-center rounded-lg px-3 text-sm font-bold ${viewMode === "compact" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500"}`} aria-label="Hiển thị dạng gọn"><ListChecks className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <aside className="space-y-4">
            <Card className="overflow-hidden rounded-[2rem] border-2 border-blue-100 bg-white shadow-xl shadow-blue-100/50">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-inner"><FolderTree className="h-6 w-6" /></div>
                    <div>
                      <h2 className="text-lg font-black">Cây phân loại</h2>
                      <p className="text-xs font-semibold text-blue-100">Cha &gt; con &gt; quiz</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  <button type="button" onClick={() => setSelectedCategoryId("all")} className={`rounded-xl px-3 py-2 text-sm font-black transition ${selectedCategoryId === "all" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-700"}`}>Tất cả</button>
                  <button type="button" onClick={() => setSelectedCategoryId("uncategorized")} className={`rounded-xl px-3 py-2 text-sm font-black transition ${selectedCategoryId === "uncategorized" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-blue-700"}`}>Chưa phân loại</button>
                </div>
                <div className="mb-4 space-y-2 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 shadow-inner">
                  <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Tên nhóm mới" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-blue-500" data-testid="new-category-name" />
                  <select value={newCategoryParentId} onChange={(event) => setNewCategoryParentId(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 outline-none" data-testid="new-category-parent"><option value="">Không có nhóm cha</option>{categoryOptions.map(category => <option key={category.id} value={category.id}>{category.path}</option>)}</select>
                  <Button type="button" onClick={handleCreateCategory} className="h-10 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700" data-testid="create-category-button"><Plus className="mr-2 h-4 w-4" />Thêm nhóm</Button>
                  {categoryError && <p className="text-xs font-bold text-red-600">{categoryError}</p>}
                </div>
                <div className="space-y-2">
                  {rootCategories.length === 0 ? <p className="rounded-2xl bg-gray-50 p-3 text-sm font-semibold text-gray-500">Chưa có nhóm phân loại.</p> : rootCategories.map(category => renderCategoryNode(category))}
                  {uncategorizedQuizzes.length > 0 && <div className="rounded-2xl border border-gray-100 bg-white p-2"><p className="mb-2 px-3 text-xs font-black uppercase text-gray-500">Quiz chưa phân loại</p><div className="space-y-1 pl-2">{uncategorizedQuizzes.slice(0, 6).map(quiz => <button key={getQuizId(quiz)} type="button" onClick={() => { setSelectedCategoryId("uncategorized"); setSearchTerm(quiz.title || ""); }} className="block w-full truncate rounded-lg bg-gray-50 px-2 py-1 text-left text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700">{quiz.title || "Quiz chưa đặt tên"}</button>)}</div></div>}
                </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section>
            {quizzes.length === 0 ? (
              <Card className="rounded-[2rem] border-2 border-gray-200 bg-white shadow-xl"><CardContent className="p-12 text-center"><FileQuestion className="mx-auto mb-4 h-16 w-16 text-gray-300" /><h3 className="mb-2 text-xl font-bold text-gray-900">Chưa có quiz nào</h3><p className="mb-6 text-gray-600">Hãy tạo quiz đầu tiên của bạn</p><Button onClick={() => navigate("/")} className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">Tạo quiz ngay</Button></CardContent></Card>
            ) : filteredQuizzes.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center"><Search className="mx-auto mb-3 h-10 w-10 text-amber-600" /><h3 className="font-black text-gray-900">Không tìm thấy quiz phù hợp</h3><p className="mt-1 text-sm text-gray-600">Thử đổi từ khóa, nhóm phân loại hoặc bộ sắp xếp.</p></div>
            ) : (
              <div className={viewMode === "grid" ? "grid gap-6 xl:grid-cols-2" : "space-y-4"}>
                {filteredQuizzes.map((quiz, idx) => {
                  const quizId = getQuizId(quiz);
                  const metrics = getQuizMetrics(quiz);
                  const isExpanded = expandedQuizId === quizId;
                  const compact = viewMode === "compact";
                  const isEditing = editingQuizId === quizId;
                  const isEditingTime = editingTimeQuizId === quizId;
                  return (
                    <motion.div key={quizId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.04, 0.3) }}>
                      <Card className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
                        <CardContent className={compact ? "p-5" : "p-6"}>
                          <div className={compact ? "grid gap-4 lg:grid-cols-[1fr_auto]" : ""}>
                            <div>
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"><CalendarDays className="h-3.5 w-3.5" />{formatDate(quiz.updatedAt || quiz.createdAt)}</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700"><FolderTree className="h-3.5 w-3.5" />{getCategoryPath(quiz.categoryId)}</span>
                                {quiz.settings?.shuffle && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><Shuffle className="h-3.5 w-3.5" />Trộn câu</span>}
                              </div>
                              <div className="mb-2">
                                {isEditing ? (
                                  <div><div className="flex gap-2"><input value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => handleRenameKeyDown(event, quizId)} autoFocus data-testid={`rename-input-${quizId}`} className="min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-3 py-2 text-lg font-black text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><Button type="button" onClick={() => handleSaveRename(quizId)} disabled={renamingId === quizId} variant="outline" className="h-11 rounded-xl border-emerald-300 text-emerald-700" aria-label="Lưu tên quiz" data-testid={`rename-save-${quizId}`}><Save className="h-4 w-4" /></Button><Button type="button" onClick={cancelRename} variant="outline" className="h-11 rounded-xl border-gray-300" aria-label="Hủy sửa tên quiz" data-testid={`rename-cancel-${quizId}`}><X className="h-4 w-4" /></Button></div>{renameError && <p className="mt-2 text-xs font-bold text-red-600">{renameError}</p>}</div>
                                ) : (
                                  <div className="flex items-start justify-between gap-3"><h3 className="text-xl font-black text-gray-900">{quiz.title || "Quiz chưa đặt tên"}</h3><button type="button" onClick={() => startRename(quiz)} className="mt-0.5 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-blue-200 hover:text-blue-700" aria-label="Sửa tên quiz" data-testid={`rename-start-${quizId}`}><Edit3 className="h-4 w-4" /></button></div>
                                )}
                              </div>
                              <p className="min-h-[2.5rem] text-sm text-gray-600">{quiz.description || "Không có mô tả"}</p>
                              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3"><label htmlFor={`quiz-category-${quizId}`} className="mb-2 block text-xs font-black uppercase text-gray-500">Nhóm phân loại</label><select id={`quiz-category-${quizId}`} value={quiz.categoryId || ""} onChange={(event) => handleUpdateQuizCategory(quiz, event.target.value)} disabled={savingQuizCategoryId === quizId} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-blue-500" data-testid={`quiz-category-select-${quizId}`}><option value="">Chưa phân loại</option>{categoryOptions.map(category => <option key={category.id} value={category.id}>{category.path}</option>)}</select></div>
                            </div>
                            <div className={compact ? "min-w-[18rem]" : ""}>
                              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-2xl bg-gray-50 p-3"><p className="text-lg font-black text-gray-900">{metrics.questionCount}</p><p className="text-xs font-bold text-gray-500">Câu</p></div>
                                <div className="rounded-2xl bg-gray-50 p-3">
                                  {isEditingTime ? <div><input type="number" min="1" max="180" value={editingTimeLimit} onChange={(event) => setEditingTimeLimit(event.target.value)} onKeyDown={(event) => handleTimeKeyDown(event, quiz)} autoFocus data-testid={`time-input-${quizId}`} className="h-8 w-full rounded-lg border border-blue-200 bg-white px-2 text-center text-sm font-black text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><div className="mt-2 flex justify-center gap-1"><button type="button" onClick={() => handleSaveTime(quiz)} disabled={savingTimeId === quizId} className="rounded-md bg-emerald-100 p-1 text-emerald-700 disabled:opacity-50" aria-label="Lưu thời gian" data-testid={`time-save-${quizId}`}><Save className="h-3.5 w-3.5" /></button><button type="button" onClick={cancelEditTime} className="rounded-md bg-gray-200 p-1 text-gray-600" aria-label="Hủy sửa thời gian" data-testid={`time-cancel-${quizId}`}><X className="h-3.5 w-3.5" /></button></div></div> : <button type="button" onClick={() => startEditTime(quiz)} className="w-full rounded-xl transition hover:bg-white" aria-label="Sửa thời gian làm bài" data-testid={`time-start-${quizId}`}><p className="text-lg font-black text-gray-900">{metrics.timeLimit}</p><p className="text-xs font-bold text-gray-500">Phút</p></button>}
                                </div>
                                <div className="rounded-2xl bg-gray-50 p-3"><p className="text-lg font-black text-gray-900">{metrics.multipleChoiceCount}</p><p className="text-xs font-bold text-gray-500">Multi</p></div>
                              </div>
                              {isEditingTime && timeEditError && <p className="mt-2 text-center text-xs font-bold text-red-600">{timeEditError}</p>}
                            </div>
                          </div>
                          {isExpanded && <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-black text-gray-800">Xem nhanh nội dung</p><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-500">{metrics.explanationCount} câu có giải thích</span></div><div className="space-y-2">{(quiz.questions || []).slice(0, 3).map((question, questionIndex) => <div key={question.id || questionIndex} className="whitespace-pre-line rounded-xl bg-white p-3 text-sm text-gray-700"><span className="font-black text-blue-700">Câu {questionIndex + 1}: </span>{question.question}</div>)}</div></div>}
                          <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => navigate(`/quiz/${quizId}/take`)} className="h-11 flex-1 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700"><PlayCircle className="mr-2 h-4 w-4" />Làm bài</Button><Button onClick={() => setExpandedQuizId(prev => prev === quizId ? null : quizId)} variant="outline" className="h-11 rounded-2xl border-gray-300 font-bold"><FileQuestion className="mr-2 h-4 w-4" />{isExpanded ? "Thu gọn" : "Xem nhanh"}</Button><Button onClick={() => handleShare(quizId)} variant="outline" className="h-11 rounded-2xl border-gray-300" aria-label="Copy link quiz">{copiedId === quizId ? <Copy className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}</Button><Button onClick={() => handleDelete(quizId)} variant="outline" className="h-11 rounded-2xl border-red-300 text-red-600 hover:bg-red-50" aria-label="Xóa quiz"><Trash2 className="h-4 w-4" /></Button></div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
