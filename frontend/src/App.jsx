import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import QuizList from "./pages/QuizList";
import QuizTake from "./pages/QuizTake";
import QuizResult from "./pages/QuizResult";
import QuizDetail from "./pages/QuizDetail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quizzes" element={<QuizList />} />
        <Route path="/quiz/:id/edit" element={<QuizDetail />} />
        <Route path="/quiz/:id/take" element={<QuizTake />} />
        <Route path="/quiz/:id/result" element={<QuizResult />} />
      </Routes>
    </Router>
  );
}

export default App;