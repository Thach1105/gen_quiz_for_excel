import React from "react";
import { useNavigate } from "react-router-dom";
import { Wand2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 shadow-lg ring-1 ring-blue-200">
          <Wand2 className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">QuizForge</h1>
          <p className="text-xs text-gray-600">Excel to Interactive Quiz</p>
        </div>
      </div>

      <nav className="hidden items-center gap-6 text-sm text-gray-700 md:flex">
        <a className="hover:text-blue-600 cursor-pointer" onClick={() => navigate("/")}>Tạo Quiz</a>
        <a className="hover:text-blue-600 cursor-pointer" onClick={() => navigate("/quizzes")}>Danh sách Quiz</a>
      </nav>

      <Button 
        onClick={() => navigate("/quizzes")}
        className="rounded-2xl bg-blue-600 text-white hover:bg-blue-700"
      >
        Xem Quiz
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </header>
  );
}