# Deploy Render + Vercel

## 1. Backend trên Render

Tạo Web Service từ repository này.

Nếu dùng dashboard Render:

- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Biến môi trường cần có:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
MONGODB_DB=excel-to-quiz
CORS_ORIGIN=https://your-frontend.vercel.app,https://*.vercel.app
```

Sau khi deploy xong, Render sẽ cấp API URL dạng:

```text
https://your-backend.onrender.com
```

Kiểm tra backend:

```text
https://your-backend.onrender.com/health
```

## 2. Frontend trên Vercel

Tạo project Vercel từ cùng repository.

Cấu hình:

- Root Directory: `frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Biến môi trường cần có:

```env
VITE_API_URL=https://your-backend.onrender.com
```

File `frontend/vercel.json` đã cấu hình rewrite về `index.html` để refresh trực tiếp các route như `/quizzes` hoặc `/quiz/:id/take` không bị 404.

## 3. Sau khi có domain Vercel thật

Cập nhật lại biến `CORS_ORIGIN` bên Render:

```env
CORS_ORIGIN=https://your-frontend.vercel.app,https://*.vercel.app
```

Nếu không dùng preview deployment của Vercel, có thể bỏ `https://*.vercel.app` và chỉ để domain production.

## 4. Thứ tự deploy đề xuất

1. Deploy backend lên Render.
2. Copy URL backend Render.
3. Deploy frontend lên Vercel với `VITE_API_URL` trỏ về backend.
4. Copy URL frontend Vercel.
5. Cập nhật `CORS_ORIGIN` trên Render bằng URL frontend Vercel.
6. Redeploy backend hoặc restart service trên Render.
