import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Layers3 } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="grid items-center gap-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <Sparkles className="h-4 w-4 text-blue-600" />
          Biến file Excel thành bài kiểm tra online trong vài bước
        </div>

        <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-gray-900 md:text-5xl">
          Upload Excel, tự động tạo quiz
          <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
            sinh động & dễ chấm điểm.
          </span>
        </h2>

        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
          Không cần code, không cần thiết kế phức tạp. Chỉ cần kéo thả file Excel của bạn,
          hệ thống sẽ tự động nhận diện câu hỏi, đáp án và tạo bài quiz hoàn chỉnh.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className="rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-blue-700">
            Bắt đầu ngay
          </button>
          <button className="rounded-2xl border-2 border-gray-300 bg-white px-6 py-3 font-bold text-gray-700 hover:bg-gray-50">
            Xem demo
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative"
      >
        <div className="rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <Layers3 className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">File Excel của bạn</h3>
              <p className="text-sm text-gray-600">De_kiem_tra_duoc_pham.xlsx</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-sm font-semibold text-blue-900">Câu hỏi 1</p>
              <p className="mt-1 text-xs text-blue-700">Tá dược nào thường được dùng làm tá dược rã trong viên nén?</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-3">
              <p className="text-sm font-semibold text-purple-900">Câu hỏi 2</p>
              <p className="mt-1 text-xs text-purple-700">Các trường nào cần có trong file Excel để tạo quiz?</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-sm font-semibold text-emerald-900">Câu hỏi 3</p>
              <p className="mt-1 text-xs text-emerald-700">Quiz có thể được xuất ra định dạng nào?</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
