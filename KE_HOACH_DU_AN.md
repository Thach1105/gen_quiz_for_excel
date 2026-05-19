# Kế hoạch và mô tả dự án Excel to Quiz

## 1. Tổng quan dự án

**Tên ứng dụng:** QuizForge - Excel to Interactive Quiz

**Mục tiêu:** Xây dựng ứng dụng web giúp người dùng upload file Excel hoặc CSV chứa câu hỏi trắc nghiệm, tự động đọc dữ liệu, xem trước câu hỏi, tạo quiz online, làm bài trực tiếp trên web và xem kết quả chấm điểm.

**Giá trị chính:**

- Giảm thao tác nhập câu hỏi thủ công.
- Chuẩn hóa cấu trúc đề thi từ file Excel.
- Hỗ trợ tạo quiz nhanh cho giáo viên, người quản lý đào tạo hoặc nhóm học tập.
- Có link quiz để làm bài và chia sẻ.
- Có 2 chế độ làm bài: kiểm tra và luyện tập.
- Có giải thích đáp án cho từng câu hỏi nếu file Excel cung cấp dữ liệu.

## 2. Trạng thái hiện tại của dự án

Dự án hiện có 3 phần chính:

- `frontend/`: ứng dụng React/Vite hiển thị giao diện upload, preview, danh sách quiz, làm bài và kết quả.
- `backend/`: API Express xử lý upload Excel/CSV, parse câu hỏi, validate dữ liệu và lưu quiz vào MongoDB.
- `tests/`: bộ test E2E bằng Playwright, chạy mock API để kiểm tra luồng UI mà không phụ thuộc MongoDB local.

Ghi chú: README cũ có nhắc Firebase, nhưng source hiện tại đang dùng MongoDB native driver làm database chính. Firebase chưa được sử dụng trong source frontend/backend hiện tại.

## 3. Tech stack thực tế

### Frontend

- **React 18:** xây dựng giao diện theo component.
- **Vite:** dev server và build tool.
- **React Router DOM:** routing các trang `/`, `/quizzes`, `/quiz/:id/take`, `/quiz/:id/result`.
- **TailwindCSS:** styling bằng utility class.
- **Framer Motion:** animation cho section, card và transition.
- **Lucide React:** bộ icon dùng cho button, trạng thái, upload và quiz.
- **Fetch API:** gọi backend API qua `frontend/src/services/api.js`.
- **clsx + tailwind-merge:** helper gộp class trong `frontend/src/utils/cn.js`.

### Backend

- **Node.js + Express:** API server.
- **MongoDB native driver:** kết nối và thao tác với collection `quizzes`.
- **Multer:** nhận file upload trong memory.
- **xlsx:** đọc file `.xlsx`, `.xls`, `.csv` và chuyển sheet thành JSON.
- **Helmet, CORS, express-rate-limit:** middleware bảo mật và giới hạn request.
- **dotenv:** đọc biến môi trường.
- **Cloudinary SDK:** có service upload/delete file, nhưng hiện chưa được dùng trong controller upload quiz.

### Testing

- **Playwright:** test E2E cho home page, upload/tạo quiz và luồng làm bài.
- E2E đang chạy trên Chromium, Firefox và WebKit.
- Playwright config chỉ khởi động frontend; các API được mock trong test để luồng UI ổn định.

## 4. Cấu trúc thư mục quan trọng

```text
excel-to-quiz/
  frontend/
    src/
      App.jsx
      main.jsx
      services/api.js
      pages/
        Home.jsx
        QuizList.jsx
        QuizTake.jsx
        QuizResult.jsx
      components/
        Header.jsx
        HeroSection.jsx
        StepsSection.jsx
        UploadSection.jsx
        PreviewSection.jsx
        FooterSection.jsx
        ui/button.jsx
        ui/card.jsx
      utils/
        cn.js
        questionType.js
    public/
      quiz-template.xlsx
      quiz-template.csv
  backend/
    generate-excel-template.js
    src/
      index.js
      routes/quiz.routes.js
      controllers/quiz.controller.js
      services/
        excel.service.js
        mongodb.service.js
        cloudinary.service.js
      middleware/
        upload.middleware.js
        error.middleware.js
  tests/
    e2e/
      helpers.js
      home.spec.js
      upload.spec.js
      quiz.spec.js
```

## 5. Chức năng hiện có

### 5.1 Trang chủ và tạo quiz

File chính:

- `frontend/src/pages/Home.jsx`
- `frontend/src/components/UploadSection.jsx`
- `frontend/src/components/PreviewSection.jsx`

Chức năng:

- Người dùng upload file `.xlsx`, `.xls`, `.csv`.
- Frontend validate extension trước khi upload.
- Backend parse file và trả về danh sách câu hỏi.
- Frontend preview câu hỏi, đáp án đúng, loại câu và giải thích nếu có.
- Khi tạo quiz, người dùng chỉ cấu hình:
  - thời gian làm bài
  - trộn câu hỏi hay không
- Không chọn mode ở bước tạo quiz. Mode được chọn khi bắt đầu làm bài.

### 5.2 Template Excel/CSV

File template hiện có các cột:

```text
Câu hỏi | A | B | C | D | Đáp án đúng | Loại câu | Giải thích
```

Ý nghĩa:

- `Câu hỏi`: nội dung câu hỏi.
- `A`, `B`, `C`, `D`: các lựa chọn.
- `Đáp án đúng`: nhập mã lựa chọn đúng theo cột `A`, `B`, `C`, `D`. Với multiple choice, nhập nhiều mã bằng dấu chấm phẩy, ví dụ `A;C`.
- `Loại câu`: `Single choice`, `Multiple choice` hoặc biến thể tương đương.
- `Giải thích`: nội dung giải thích hiển thị khi xem đáp án.

Field `Giải thích` là optional. File cũ không có cột này vẫn parse được, khi đó `question.explanation` là chuỗi rỗng.

Không nên nhập nội dung đáp án đúng bằng text phân tách dấu phẩy, vì nội dung đáp án có thể chứa dấu phẩy. Parser hiện ưu tiên mã đáp án A-D và vẫn giữ tương thích với file cũ đang nhập text đáp án.

### 5.3 Parser Excel

File chính:

- `backend/src/services/excel.service.js`

Chức năng:

- Tự detect cột câu hỏi, đáp án A-D, đáp án đúng, loại câu và giải thích.
- Normalize tiếng Việt có dấu, bao gồm cả ký tự `đ`.
- Hỗ trợ các header như `Giải thích`, `Giai thich`, `Explanation`, `Explain`.
- Normalize loại câu về `Single choice` hoặc `Multiple choice`.
- Cột `Đáp án đúng` hỗ trợ mã đáp án như `B`, `A;C`; backend map mã này sang nội dung lựa chọn tương ứng. Dạng `A,C` vẫn được chấp nhận cho mã đáp án để tương thích, nhưng template ưu tiên `A;C`.
- Lưu `question.answer` dạng array nội dung đáp án đúng, ví dụ `["Câu hỏi", "Đáp án A-D", "Đáp án đúng"]`.
- Chặn trường hợp giá trị loại câu bị map nhầm vào option.

### 5.4 Danh sách quiz

File chính:

- `frontend/src/pages/QuizList.jsx`

Chức năng:

- Lấy danh sách quiz mới nhất từ `GET /api/quiz`.
- Hiển thị title, description, số câu hỏi, thời gian.
- Cho vào làm bài.
- Cho copy link chia sẻ.
- Cho xóa quiz bằng `DELETE /api/quiz/:id`.

### 5.5 Làm bài quiz

File chính:

- `frontend/src/pages/QuizTake.jsx`

Luồng bắt đầu:

- Người dùng mở link làm quiz.
- Màn bắt đầu cho chọn mode:
  - `Kiểm tra`
  - `Luyện tập`
- Với `Luyện tập`, người dùng có thêm lựa chọn bật/tắt tính giờ. Mặc định bật.

Mode `Kiểm tra`:

- Luôn dùng timer theo `settings.timeLimit`.
- Người dùng chọn đáp án nhưng không thấy đáp án đúng trong lúc làm bài.
- Khi nộp bài hoặc hết giờ, hệ thống chuyển sang trang kết quả.
- Trang kết quả mới hiển thị điểm, đáp án đúng và giải thích.

Mode `Luyện tập`:

- Có thể bật hoặc tắt timer.
- Nếu bật timer, hết giờ tự nộp bài.
- Nếu tắt timer, màn làm bài hiển thị `Không giới hạn` và không tự nộp.
- Sau khi chọn đáp án, người dùng bấm `Xem đáp án đúng` để xem:
  - đúng/sai của câu hiện tại
  - đáp án đúng
  - giải thích nếu có
- Câu đã xem đáp án sẽ bị khóa, không cho đổi đáp án.
- Vẫn có trang kết quả cuối bài.

Điều hướng câu hỏi:

- Màn làm bài có bảng số thứ tự câu hỏi.
- Mỗi số câu thể hiện trạng thái:
  - câu hiện tại
  - chưa làm
  - đã làm
  - đã xem đáp án trong practice
- Người dùng có thể bấm vào số câu để nhảy đến câu đó.

### 5.6 Kết quả quiz

File chính:

- `frontend/src/pages/QuizResult.jsx`

Chức năng:

- Hiển thị điểm phần trăm.
- Hiển thị số câu đúng/tổng câu.
- Hiển thị mode đã làm: `Kiểm tra` hoặc `Luyện tập`.
- Hiển thị thời gian làm bài; nếu practice tắt timer thì ghi rõ không giới hạn.
- Nếu hết giờ tự nộp, hiển thị thông báo hệ thống đã tự nộp.
- Hiển thị chi tiết từng câu:
  - câu trả lời của người dùng
  - đáp án đúng
  - đúng/sai
  - giải thích nếu có

## 6. API hiện có

Base URL mặc định frontend dùng:

```text
http://localhost:5000
```

Nếu chạy qua Vite dev server, `vite.config.js` có proxy `/api` sang backend port `5000`, nhưng service hiện dùng `VITE_API_URL` hoặc mặc định `http://localhost:5000`.

### `GET /health`

Kiểm tra backend đang hoạt động.

### `POST /api/quiz/upload`

Upload file Excel/CSV và parse thành questions.

Output chính:

```json
{
  "success": true,
  "data": {
    "questions": [],
    "mapping": {},
    "validation": {},
    "fileName": "quiz.xlsx"
  }
}
```

### `POST /api/quiz`

Tạo quiz mới.

Input chính:

```json
{
  "title": "Quiz từ Excel",
  "description": "Quiz được tạo từ file Excel",
  "questions": [],
  "settings": {
    "timeLimit": 30,
    "shuffle": true
  }
}
```

Lưu ý: `settings.mode` không còn được gửi khi tạo quiz.

### `GET /api/quiz`

Lấy danh sách quiz, có hỗ trợ `limit` và `offset`.

### `GET /api/quiz/:id`

Lấy chi tiết quiz theo MongoDB ObjectId.

### `PUT /api/quiz/:id`

Cập nhật quiz.

### `DELETE /api/quiz/:id`

Xóa quiz.

## 7. Data model hiện tại

### Quiz document

```json
{
  "_id": "ObjectId",
  "title": "Quiz từ Excel",
  "description": "Quiz được tạo từ file Excel",
  "questions": [],
  "settings": {
    "timeLimit": 30,
    "shuffle": true
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Question object

```json
{
  "id": 1,
  "question": "Nội dung câu hỏi",
  "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
  "answer": ["Lựa chọn B"],
  "type": "Single choice",
  "explanation": "Giải thích đáp án"
}
```

Với multiple choice, `answer` được lưu dạng array nội dung đáp án đúng:

```json
{
  "answer": ["Lựa chọn A", "Lựa chọn C"],
  "type": "Multiple choice",
  "explanation": "A và C là hai đáp án đúng."
}
```

Ghi chú tương thích:

- File Excel mới nên nhập cột `Đáp án đúng` bằng mã A-D, ví dụ `B` hoặc `A;C`.
- Backend sẽ map mã A-D sang nội dung đáp án và lưu vào `answer` dạng array.
- Quiz cũ đang lưu `answer` là string vẫn được frontend/backend đọc theo cơ chế tương thích.

## 8. Kiểm thử đã cập nhật

Các test E2E hiện kiểm tra:

- Màn tạo quiz không còn nút chọn `Kiểm tra/Luyện tập`.
- Upload file trả về câu hỏi có `explanation` và preview hiển thị giải thích.
- Tạo quiz không gửi `settings.mode`.
- Parser map `Đáp án đúng` từ mã A-D sang array đáp án đúng và xử lý đúng đáp án có dấu phẩy trong nội dung.
- Exam không hiển thị đáp án đúng trước khi nộp.
- Sau khi nộp exam, kết quả hiển thị đáp án đúng và giải thích.
- Practice bấm `Xem đáp án đúng` sẽ hiện đáp án/giải thích ngay.
- Câu đã xem đáp án trong practice bị khóa.
- Multiple choice chọn được nhiều đáp án.
- Bảng điều hướng câu hỏi nhảy đúng câu và thể hiện trạng thái đã làm/chưa làm.
- Hết giờ tự nộp bài.
- Practice tắt timer không tự nộp và hiển thị `Không giới hạn`.

Kết quả kiểm thử gần nhất:

```text
cd frontend
npm run build
# Passed

npm run test:e2e
# 30 passed
```

Ngoài E2E, parser đã được kiểm tra với `frontend/public/quiz-template.xlsx`: mapping nhận đúng `Đáp án đúng`, `Loại câu`, `Giải thích` và trả `answer` dạng array sau khi map mã đáp án.

## 9. Rủi ro và điểm cần cải thiện

- **Encoding tiếng Việt trong một số file cũ:** nhiều text UI cũ vẫn có dấu hiệu mojibake. Các file mới/chỉnh gần đây đã dùng UTF-8 có dấu.
- **README lệch với source:** README nhắc Firebase, nhưng source hiện dùng MongoDB. Cần cập nhật README.
- **Shuffle setting chưa rõ đã được áp dụng:** UI có toggle shuffle, nhưng logic trộn câu hỏi/đáp án chưa thấy được áp dụng trong `QuizTake.jsx`.
- **Dữ liệu cũ có thể còn answer dạng string:** frontend/backend đã có lớp tương thích, nhưng khi chỉnh/sửa quiz về sau nên migrate dần sang `answer` dạng array.
- **Cloudinary service chưa được dùng:** nếu không cần lưu file gốc, có thể bỏ; nếu cần audit/import history, nên tích hợp.

## 10. Roadmap hoàn thiện dự án

### Giai đoạn 1: Ổn định luồng core

- Chuẩn hóa toàn bộ text UI cũ sang UTF-8 có dấu.
- Cập nhật README theo tech stack thực tế.
- Áp dụng shuffle câu hỏi/đáp án khi setting bật.

### Giai đoạn 2: Cải thiện trải nghiệm làm quiz

- Thêm điều hướng nhanh theo nhóm câu hoặc trạng thái.
- Lưu tạm bài làm trên localStorage để tránh mất bài khi refresh.
- Thêm xác nhận trước khi thoát bài đang làm.

### Giai đoạn 3: Quản lý quiz tốt hơn

- Thêm trang xem/sửa quiz trước khi publish.
- Cho đổi title, description khi tạo quiz.
- Thêm import history.
- Thêm clone quiz.
- Thêm tìm kiếm/filter danh sách quiz.

### Giai đoạn 4: Chuẩn hóa dữ liệu và bảo mật

- Schema validation rõ ràng hơn cho quiz/question.
- Migrate dữ liệu quiz cũ để mọi `answer` đều dùng array nội dung đáp án đúng.
- Thêm auth nếu cần quản lý quiz theo người dùng.
- Thêm rate limit riêng cho upload.
- Thêm log lỗi và monitoring.

## 11. Lệnh chạy dự án

### Backend

```bash
cd backend
npm install
npm run dev
```

Cần biến môi trường:

```text
MONGODB_URI=...
CORS_ORIGIN=http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy:

```text
http://localhost:3000
```

Backend mặc định chạy:

```text
http://localhost:5000
```

### Build

```bash
cd frontend
npm run build
```

### E2E test

```bash
cd frontend
npm run test:e2e
```

## 12. Kết luận

Dự án đã có đầy đủ nền tảng cho một ứng dụng Excel-to-Quiz: upload file, parse câu hỏi, preview, tạo quiz, lưu MongoDB, làm bài và xem kết quả. Luồng mode đã được tách đúng vị trí: không chọn khi tạo quiz, chỉ chọn khi bắt đầu làm bài. Template và data model đã bổ sung `Giải thích`, giúp practice mode và trang kết quả giải thích đáp án rõ ràng hơn.
