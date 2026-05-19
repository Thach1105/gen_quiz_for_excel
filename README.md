# Excel to Quiz - QuizForge

Ứng dụng web chuyển đổi file Excel thành bài kiểm tra trắc nghiệm tương tác.

## Công nghệ sử dụng

### Frontend
- React.js 18
- Vite
- TailwindCSS
- Framer Motion
- Lucide React Icons
- Firebase (Authentication, Firestore, Storage)

### Backend
- Node.js
- Express.js
- Firebase Admin SDK
- XLSX (xử lý file Excel)

### Testing
- Playwright (E2E testing)

## Cấu trúc dự án

```
excel-to-quiz/
├── frontend/          # React application
├── backend/           # Node.js API
├── tests/             # Playwright E2E tests
└── README.md
```

## Cài đặt

### Yêu cầu
- Node.js >= 18.x
- npm hoặc yarn
- Firebase project

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Cập nhật thông tin Firebase trong .env
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Cập nhật thông tin Firebase Admin SDK trong .env
npm run dev
```

## Cấu hình Firebase

### Bước 1: Tạo Firebase Project
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới
3. Kích hoạt Authentication (Email/Password)
4. Tạo Firestore Database
5. Tạo Storage bucket

### Bước 2: Lấy thông tin cấu hình

#### Frontend (Web App)
1. Project Settings > General > Your apps
2. Chọn Web app và copy config
3. Paste vào `frontend/.env`

#### Backend (Admin SDK)
1. Project Settings > Service accounts
2. Generate new private key
3. Lưu file JSON và cập nhật thông tin vào `backend/.env`

## Chạy ứng dụng

### Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Production Build

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## Testing

### E2E Tests với Playwright

```bash
cd frontend
npm run test:e2e
```

## Tính năng

- ✅ Upload file Excel (.xlsx, .xls, .csv)
- ✅ Tự động nhận diện cột câu hỏi, đáp án
- ✅ Preview câu hỏi trước khi tạo quiz
- ✅ Tùy chỉnh thời gian, điểm số
- ✅ Trộn câu hỏi ngẫu nhiên
- ✅ Export quiz ra nhiều định dạng
- ✅ Chia sẻ link quiz online
- ✅ Lưu trữ trên Firebase

## Cấu trúc file Excel

File Excel cần có các cột:
- **Câu hỏi**: Nội dung câu hỏi
- **A, B, C, D**: Các đáp án
- **Đáp án đúng**: Đáp án đúng (A, B, C, D hoặc nhiều đáp án)
- **Loại câu**: Single choice / Multiple choice (optional)

## License

MIT
