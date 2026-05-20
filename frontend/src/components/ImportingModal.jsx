import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImportingModal({ visible, onCancel }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="w-full max-w-md rounded-[2rem] border border-gray-200 bg-white p-6 shadow-2xl"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600" />
              <h3 className="text-xl font-bold text-gray-900">Đang phân tích tài liệu</h3>
              <p className="mt-2 text-sm text-gray-600">
                Gemini đang đọc nội dung PDF và tạo danh sách câu hỏi để bạn xem trước.
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <Button type="button" variant="outline" onClick={onCancel} className="rounded-2xl">
                <X className="mr-2 h-4 w-4" />
                Hủy
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
