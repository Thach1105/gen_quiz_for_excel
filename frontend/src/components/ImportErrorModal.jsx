import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ImportErrorModal({ visible, title, message, onClose, onRetry }) {
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
            className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-6 shadow-2xl"
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {onRetry && (
                <Button type="button" onClick={onRetry} className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Thử lại
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} className="rounded-2xl">
                <X className="mr-2 h-4 w-4" />
                Đóng
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
