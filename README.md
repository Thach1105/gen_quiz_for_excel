# gen_quiz_for_excel

Ứng dụng web chuyển file Excel/CSV thành bài quiz trắc nghiệm. Dự án gồm frontend React/Vite, backend Express/MongoDB và bộ test E2E Playwright.

## Chức năng chính

- Upload file `.xlsx`, `.xls`, `.csv` để parse câu hỏi.
- Tự nhận diện cột câu hỏi, đáp án A-D, đáp án đúng, loại câu và giải thích.
- Hỗ trợ `Single choice` và `Multiple choice`.
- Cột `Đáp án đúng` nên dùng mã đáp án như `A`, `B`, `A;C`; backend map sang nội dung đáp án thật và lưu dạng array.
- Tạo quiz, lưu MongoDB, chia sẻ link làm bài.
- Khi làm quiz mới chọn mode:
  - `Exam`: chỉ hiện kết quả/đáp án đúng sau khi nộp.
  - `Practice`: có thể xem đáp án đúng và giải thích từng câu.
- Có bảng điều hướng câu hỏi, đánh dấu câu cần xem lại, timer và tự nộp khi hết giờ.
- Trang kết quả có thống kê, lọc câu đúng/sai/chưa trả lời/đã đánh dấu.

## Tech stack

### Frontend

- React 18
- Vite
- TailwindCSS
- Framer Motion
- Lucide React
- Playwright E2E

### Backend

- Node.js
- Express.js
- MongoDB native driver
- Multer
- XLSX
- Helmet, CORS, rate limit

## Cài đặt local

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Biến môi trường backend:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
MONGODB_DB=excel-to-quiz
CORS_ORIGIN=http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Biến môi trường frontend:

```env
VITE_API_URL=http://localhost:5000
```

## Build và test

```bash
cd frontend
npm run build
npm run test:e2e
```

## Deploy

Xem hướng dẫn chi tiết trong [DEPLOYMENT.md](DEPLOYMENT.md).

Tóm tắt:

- Render backend: root directory `backend`, start command `npm start`.
- Vercel frontend: root directory `frontend`, build command `npm run build`, output `dist`.
- Vercel cần `VITE_API_URL=https://your-backend.onrender.com`.
- Render cần `CORS_ORIGIN=https://your-frontend.vercel.app,https://*.vercel.app`.

## Cấu trúc file template

```text
Câu hỏi | A | B | C | D | Đáp án đúng | Loại câu | Giải thích
```

Ví dụ:

```text
Câu nhiều đáp án? | Đáp án A | Đáp án B | Đáp án C | Đáp án D | A;C | Multiple choice | Giải thích tùy chọn
```
