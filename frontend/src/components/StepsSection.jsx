import React from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileSpreadsheet, Sparkles } from "lucide-react";

const steps = [
  { title: "Tải file Excel", desc: "Kéo thả hoặc chọn file .xlsx, .xls, .csv", icon: UploadCloud },
  { title: "Kiểm tra dữ liệu", desc: "Tự nhận cột câu hỏi, đáp án và đáp án đúng", icon: FileSpreadsheet },
  { title: "Tạo bài quiz", desc: "Tùy chỉnh thời gian, điểm số và trộn câu", icon: Sparkles },
];

export default function StepsSection() {
  return (
    <section className="py-6">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-2xl font-black text-gray-900 md:text-3xl">
            Chỉ cần 3 bước đơn giản
          </h3>
          <p className="mt-2 text-sm text-gray-600 md:text-base">
            Từ Excel/PDF đến quiz hoàn chỉnh trong vài phút
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className="rounded-3xl border-2 border-gray-200 bg-white p-5 shadow-lg transition-shadow hover:shadow-xl"
            >
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h4 className="mb-1 text-lg font-bold text-gray-900">{step.title}</h4>
              <p className="text-sm text-gray-600">{step.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
