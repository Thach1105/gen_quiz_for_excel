import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  Settings2,
  PlayCircle,
  CheckCircle2,
  Clock3,
  Shuffle,
  Eye,
  Download,
  Wand2,
  HelpCircle,
  Layers3,
  ShieldCheck,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const sampleQuestions = [
  {
    id: 1,
    question: "Tá dược nào thường được dùng làm tá dược rã trong viên nén?",
    options: ["Lactose", "Crospovidon", "Talc", "Parafin"],
    answer: "Crospovidon",
    type: "Single choice",
  },
  {
    id: 2,
    question: "Các trường nào cần có trong file Excel để tạo quiz?",
    options: ["Câu hỏi", "Đáp án A-D", "Đáp án đúng", "Ảnh đại diện"],
    answer: "Câu hỏi, Đáp án A-D, Đáp án đúng",
    type: "Multiple choice",
  },
  {
    id: 3,
    question: "Quiz có thể được xuất ra định dạng nào?",
    options: ["PDF", "Link online", "JSON", "Tất cả đều đúng"],
    answer: "Tất cả đều đúng",
    type: "Single choice",
  },
];

const steps = [
  { title: "Tải file Excel", desc: "Kéo thả hoặc chọn file .xlsx, .xls, .csv", icon: UploadCloud },
  { title: "Kiểm tra dữ liệu", desc: "Tự nhận cột câu hỏi, đáp án và đáp án đúng", icon: FileSpreadsheet },
  { title: "Tạo bài quiz", desc: "Tùy chỉnh thời gian, điểm số và trộn câu", icon: Sparkles },
];

export default function ExcelToQuizUI() {
  const [quizMode, setQuizMode] = useState("exam");
  const [fileName, setFileName] = useState("De_kiem_tra_duoc_pham.xlsx");
  const [shuffle, setShuffle] = useState(true);

  const progress = useMemo(() => (fileName ? 78 : 0), [fileName]);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-28 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-24 right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/15 backdrop-blur">
            <Wand2 className="h-6 w-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">QuizForge</h1>
            <p className="text-xs text-slate-400">Excel to Interactive Quiz</p>
          </div>
        </div>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a className="hover:text-white" href="#upload">Upload</a>
          <a className="hover:text-white" href="#preview">Preview</a>
          <a className="hover:text-white" href="#settings">Cài đặt</a>
        </nav>

        <Button className="rounded-2xl bg-white text-slate-950 hover:bg-cyan-100">
          Tạo quiz ngay
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-cyan-100 backdrop-blur">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Biến file Excel thành bài kiểm tra online trong vài bước
            </div>

            <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-tight md:text-6xl">
              Upload Excel, tự động tạo quiz
              <span className="block bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-emerald-300 bg-clip-text text-transparent">
                sinh động & dễ chấm điểm.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Giao diện hỗ trợ đọc câu hỏi từ Excel, xem trước dữ liệu, tùy chỉnh thời gian làm bài,
              trộn câu hỏi, xuất đề và chia sẻ bài quiz bằng link.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button className="h-12 rounded-2xl bg-cyan-400 px-6 font-bold text-slate-950 hover:bg-cyan-300">
                <UploadCloud className="mr-2 h-5 w-5" />
                Chọn file Excel
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-white/15 bg-white/5 px-6 text-white hover:bg-white/10">
                <Eye className="mr-2 h-5 w-5" />
                Xem demo
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["500+", "câu hỏi/import"],
                ["3", "kiểu câu hỏi"],
                ["1 click", "xuất quiz"],
              ].map(([num, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-2xl font-black text-white">{num}</div>
                  <div className="text-sm text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-cyan-400/20 via-fuchsia-400/20 to-emerald-400/20 blur-2xl" />
            <Card className="relative overflow-hidden rounded-[2rem] border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl">
              <CardContent className="p-5 md:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Trình tạo quiz</p>
                    <h3 className="text-2xl font-bold text-white">Excel Import</h3>
                  </div>
                  <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-300/20">
                    Ready
                  </div>
                </div>

                <div id="upload" className="rounded-3xl border border-dashed border-cyan-300/40 bg-slate-950/40 p-6 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-cyan-400/15 ring-1 ring-cyan-300/25">
                    <UploadCloud className="h-8 w-8 text-cyan-300" />
                  </div>
                  <h4 className="mt-4 text-lg font-bold text-white">Kéo thả file Excel vào đây</h4>
                  <p className="mt-2 text-sm text-slate-400">Hỗ trợ .xlsx, .xls, .csv — tối đa 20MB</p>
                  <Button className="mt-5 rounded-2xl bg-white text-slate-950 hover:bg-slate-200">
                    Browse file
                  </Button>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/15">
                        <FileSpreadsheet className="h-6 w-6 text-emerald-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{fileName}</p>
                        <p className="text-sm text-slate-400">128 câu hỏi • 4 cột đáp án • 2 lỗi cần kiểm tra</p>
                      </div>
                    </div>
                    <button onClick={() => setFileName("")} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Đang phân tích cấu trúc file: {progress}%</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <Card className="rounded-3xl border-white/10 bg-white/8 backdrop-blur hover:bg-white/12">
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                        <Icon className="h-6 w-6 text-cyan-300" />
                      </div>
                      <span className="text-sm font-bold text-slate-500">0{index + 1}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{step.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <section className="grid gap-6 py-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Card id="settings" className="rounded-[2rem] border-white/10 bg-white/8 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-fuchsia-400/15">
                  <Settings2 className="h-6 w-6 text-fuchsia-300" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Cấu hình quiz</h3>
                  <p className="text-sm text-slate-400">Tùy chỉnh trước khi xuất bài kiểm tra</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Chế độ làm bài</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["practice", "Ôn tập"],
                      ["exam", "Kiểm tra"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setQuizMode(value)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          quizMode === value
                            ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                            : "border-white/10 bg-slate-950/35 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <div className="font-bold">{label}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {value === "exam" ? "Có thời gian & điểm" : "Xem đáp án sau mỗi câu"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                      <Clock3 className="h-4 w-4 text-cyan-300" />
                      Thời gian
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-white">45</span>
                      <span className="mb-1 text-sm text-slate-400">phút</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
                      <Layers3 className="h-4 w-4 text-fuchsia-300" />
                      Số câu
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-white">50</span>
                      <span className="mb-1 text-sm text-slate-400">/128 câu</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShuffle(!shuffle)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-left hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/15">
                      <Shuffle className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Trộn câu hỏi & đáp án</p>
                      <p className="text-sm text-slate-400">Giảm gian lận khi làm bài</p>
                    </div>
                  </div>
                  <div className={`h-7 w-12 rounded-full p-1 transition ${shuffle ? "bg-cyan-300" : "bg-white/15"}`}>
                    <div className={`h-5 w-5 rounded-full bg-slate-950 transition ${shuffle ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </button>

                <Button className="h-12 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 font-black text-slate-950 hover:opacity-90">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Tạo bài quiz
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card id="preview" className="rounded-[2rem] border-white/10 bg-white/8 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-white">Preview câu hỏi</h3>
                  <p className="text-sm text-slate-400">Kiểm tra nhanh dữ liệu sau khi import Excel</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button className="rounded-2xl bg-white text-slate-950 hover:bg-slate-200">
                    Share link
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {sampleQuestions.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06 }}
                    className="rounded-3xl border border-white/10 bg-slate-950/40 p-5"
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-xs font-bold text-cyan-200">
                            Câu {item.id}
                          </span>
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                            {item.type}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold leading-7 text-white">{item.question}</h4>
                      </div>
                      <HelpCircle className="h-5 w-5 text-slate-500" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {item.options.map((option) => {
                        const isCorrect = item.answer.includes(option);
                        return (
                          <div
                            key={option}
                            className={`flex items-center justify-between rounded-2xl border p-3 text-sm ${
                              isCorrect
                                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                                : "border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >
                            <span>{option}</span>
                            {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-r from-cyan-400/15 via-fuchsia-400/15 to-emerald-400/15 p-6 backdrop-blur-xl md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Gợi ý cấu trúc Excel chuẩn
              </div>
              <h3 className="text-2xl font-black text-white md:text-3xl">Câu hỏi | A | B | C | D | Đáp án đúng | Loại câu</h3>
              <p className="mt-3 max-w-3xl text-slate-300">
                Hệ thống nên có màn hình mapping cột để người dùng tự chọn cột tương ứng nếu file Excel không đúng mẫu.
              </p>
            </div>
            <Button className="h-12 rounded-2xl bg-white px-6 font-black text-slate-950 hover:bg-cyan-100">
              Tải file mẫu
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
