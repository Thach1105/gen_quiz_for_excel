# Kế hoạch import quiz từ PDF bằng Gemini

## Context

Cần bổ sung một đường import quiz mới không phụ thuộc Excel: người dùng upload tài liệu nguồn (ưu tiên PDF, có thể mở rộng DOCX) cùng metadata quiz hiện có, backend dùng Gemini API để đọc tài liệu và sinh ra danh sách câu hỏi theo đúng shape quiz hiện tại, sau đó validate và lưu thẳng vào MongoDB. Mục tiêu là tái sử dụng tối đa luồng tạo quiz sẵn có ở backend/frontend, chỉ thêm một nhánh import tài liệu song song với nhánh Excel.

## Recommended approach

### 1) Giữ nguyên shape dữ liệu và validation hiện có

Tái sử dụng canonical question shape đang được tạo ở [backend/src/services/excel.service.js](backend/src/services/excel.service.js) qua `transformToQuizFormat`:
- `question`
- `options`
- `answer`
- `type` (`Single choice` | `Multiple choice`)
- `explanation`
- `id` gán tuần tự ở server

Tái sử dụng `validateQuizData` trong cùng file để kiểm tra dữ liệu Gemini trả về trước khi lưu DB. Không đổi schema MongoDB hiện tại ở [backend/src/controllers/quiz.controller.js](backend/src/controllers/quiz.controller.js).

### 2) Thêm endpoint backend mới cho document import

Thêm endpoint mới trong [backend/src/routes/quiz.routes.js](backend/src/routes/quiz.routes.js):
- `POST /api/quiz/import-from-document`

Request nên là `multipart/form-data` gồm:
- `file`: PDF hoặc DOCX
- `title`: optional
- `description`: optional
- `categoryId`: optional
- `timeLimit`: optional
- `shuffle`: optional

Khuyến nghị endpoint này là **single-step parse + persist** thay vì preview trước rồi mới save như Excel, vì:
- Gemini xử lý chậm hơn parse Excel
- Không có mapping column để người dùng chỉnh giữa chừng
- UX đơn giản hơn: upload tài liệu → tạo quiz luôn

Response success nên đồng nhất với `POST /api/quiz`:
- `201 { success: true, data: serializedQuiz }`

Response lỗi nên bám pattern hiện tại:
- `400` nếu quiz sinh ra không hợp lệ
- `502` nếu Gemini/API lỗi hoặc trả JSON không parse được

### 3) Tách Gemini integration vào service riêng

Thêm file mới:
- `backend/src/services/gemini.service.js`

Service này chỉ chịu trách nhiệm:
- nhận `file buffer` + `mime type`
- gọi Gemini model với document input
- yêu cầu structured JSON output theo schema câu hỏi
- parse response thành mảng question objects thô
- chuẩn hóa/gán `id` tuần tự

Cách tích hợp khuyến nghị:
- dùng server-side Gemini SDK với `GEMINI_API_KEY` trong env
- dùng structured output / JSON schema để ép response về đúng shape
- prompt ngắn, tập trung vào extraction sang quiz JSON; không để model tự do trả prose

JSON schema đầu ra nên bám sát shape hiện có:
- array of questions
- mỗi question có `question`, `options`, `answer`, `type`, `explanation`
- `id` không cần tin tưởng model; server tự gán lại sau khi parse

### 4) Hỗ trợ upload document qua middleware riêng

Mở rộng [backend/src/middleware/upload.middleware.js](backend/src/middleware/upload.middleware.js):
- giữ nguyên `uploadExcel`
- thêm `uploadDocument`
- `memoryStorage` vẫn phù hợp
- cho phép `.pdf` và bước đầu có thể thêm `.docx`

Khuyến nghị phạm vi phase 1:
- **Ưu tiên PDF trước**
- DOCX chỉ bật nếu Gemini SDK/path xử lý tài liệu xác nhận ổn định trong môi trường hiện tại

Nếu muốn giảm rủi ro triển khai lần đầu, có thể ship phase 1 với PDF only, sau đó mở rộng DOCX ở phase 2.

### 5) Tái sử dụng logic tạo quiz trong controller hiện có

Trong [backend/src/controllers/quiz.controller.js](backend/src/controllers/quiz.controller.js):
- thêm controller `importQuizFromDocument`
- controller mới sẽ:
  1. kiểm tra `req.file`
  2. gọi `gemini.service.js` để lấy `questions`
  3. gọi `validateQuizData(questions)`
  4. resolve `categoryId` bằng `resolveCategoryId`
  5. tạo quiz document với cùng structure như `createQuiz`
  6. insert vào `quizzes`
  7. trả về `serializeQuiz(...)`

Để tránh lặp code, nên rút phần build + insert quiz document từ `createQuiz` thành helper nội bộ trong cùng controller file, rồi để cả `createQuiz` và `importQuizFromDocument` dùng chung.

Các utility/backend function nên tái sử dụng:
- `validateQuizData` — [backend/src/services/excel.service.js](backend/src/services/excel.service.js)
- `resolveCategoryId` — [backend/src/controllers/quiz.controller.js](backend/src/controllers/quiz.controller.js)
- `serializeQuiz` — [backend/src/controllers/quiz.controller.js](backend/src/controllers/quiz.controller.js)
- title normalization / auto-title logic đang có trong cùng controller file

### 6) Mở rộng frontend theo hướng ít phá vỡ nhất

Các file chính:
- [frontend/src/components/UploadSection.jsx](frontend/src/components/UploadSection.jsx)
- [frontend/src/services/api.js](frontend/src/services/api.js)
- [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx)

Khuyến nghị UI:
- thêm lựa chọn nguồn import: `Excel` / `Document`
- giữ nguyên các field metadata đang có: title, category, shuffle, timeLimit
- khi ở mode `Document`:
  - file input nhận `.pdf` (và có thể `.docx` nếu bật)
  - bỏ bước parse-preview ngay khi chọn file
  - chỉ gọi API khi người dùng bấm “Tạo bài quiz”
  - hiển thị loading state rõ ràng kiểu “Đang tạo quiz bằng AI...”

Trong [frontend/src/services/api.js](frontend/src/services/api.js):
- thêm hàm `importQuizFromDocument(formData)` hoặc helper tạo `FormData`
- POST đến `/api/quiz/import-from-document`

Trong [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx):
- giữ flow Excel hiện tại
- thêm nhánh document import để gọi endpoint mới
- sau khi tạo thành công thì điều hướng về danh sách quiz giống flow hiện tại

### 7) Ràng buộc và quyết định kỹ thuật

#### Khuyến nghị phạm vi phase 1
- Ship với **PDF first** để giảm rủi ro
- Không cố hỗ trợ mọi định dạng Word ngay từ đầu nếu chưa xác nhận ổn định
- Không thay đổi DB schema
- Không thay đổi flow Excel hiện có

#### Error handling cần có
- file type không hợp lệ → reject ngay từ middleware
- Gemini trả JSON sai schema / parse lỗi → 502 với message rõ ràng
- Gemini trả về câu hỏi thiếu dữ liệu → 400 từ `validateQuizData`
- thiếu `GEMINI_API_KEY` → fail-fast ở backend config/service

#### Bảo mật
- API key chỉ nằm ở backend
- không gửi key xuống frontend
- validate/sanitize toàn bộ output từ model trước khi insert DB

## Critical files to modify

### Backend
- [backend/src/routes/quiz.routes.js](backend/src/routes/quiz.routes.js)
- [backend/src/controllers/quiz.controller.js](backend/src/controllers/quiz.controller.js)
- [backend/src/middleware/upload.middleware.js](backend/src/middleware/upload.middleware.js)
- [backend/src/services/excel.service.js](backend/src/services/excel.service.js) — chỉ để tái sử dụng validation, hạn chế sửa nếu không cần
- `backend/src/services/gemini.service.js` (new)
- file env/example tương ứng ở backend để khai báo `GEMINI_API_KEY`

### Frontend
- [frontend/src/components/UploadSection.jsx](frontend/src/components/UploadSection.jsx)
- [frontend/src/services/api.js](frontend/src/services/api.js)
- [frontend/src/pages/Home.jsx](frontend/src/pages/Home.jsx)

## Verification

### Backend verification
1. Test `POST /api/quiz/import-from-document` với PDF mẫu có câu hỏi rõ ràng.
2. Xác nhận response trả về quiz đã được lưu DB, cùng shape với `createQuiz` hiện tại.
3. Test file invalid (`.txt`) để chắc middleware chặn đúng.
4. Test tài liệu không trích xuất được câu hỏi để chắc `validateQuizData` trả `400`.
5. Test khi thiếu hoặc sai `GEMINI_API_KEY` để chắc backend trả lỗi rõ ràng.

### Frontend verification
1. Chọn mode `Document`, upload PDF, nhập metadata, bấm tạo quiz.
2. Xác nhận loading state và thông báo lỗi/success đúng.
3. Xác nhận sau khi thành công, quiz xuất hiện trong danh sách.
4. Re-test mode `Excel` để đảm bảo không regression.

### End-to-end
- Chạy app backend + frontend
- Thử import ít nhất 1 PDF thật
- Kiểm tra quiz được render/hiển thị bình thường ở các màn hình hiện có
- Chạy test suite hiện có liên quan đến upload/create quiz nếu repo đã có
