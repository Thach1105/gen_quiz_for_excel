import React from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FooterSection() {
  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/quiz-template.xlsx";
    link.download = "quiz-template.xlsx";
    link.click();
  };

  return (
    <section className="py-12">
      <div className="rounded-[2rem] border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-purple-50 to-emerald-50 p-6 md:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-gray-700 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Gợi ý cấu trúc Excel chuẩn
            </div>
            <h3 className="text-2xl font-black text-gray-900 md:text-3xl">
              Câu hỏi | A | B | C | D | Đáp án đúng | Loại câu | Giải thích
            </h3>
            <p className="mt-3 max-w-3xl text-gray-700">
              Tải file Excel mẫu (.xlsx) với 10 câu hỏi mẫu. Cột đáp án đúng dùng mã A/B/C/D; câu nhiều đáp án dùng dạng A;C.
            </p>
          </div>
          <Button 
            onClick={handleDownloadTemplate}
            className="h-12 rounded-2xl bg-blue-600 px-6 font-black text-white hover:bg-blue-700"
          >
            Tải file mẫu Excel
          </Button>
        </div>
      </div>
    </section>
  );
}
