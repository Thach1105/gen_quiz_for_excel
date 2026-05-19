import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const quizData = [
  ["Câu hỏi", "A", "B", "C", "D", "Đáp án đúng", "Loại câu", "Giải thích"],
  [
    "Tá dược nào thường được dùng làm tá dược rã trong viên nén?",
    "Lactose",
    "Crospovidon",
    "Talc",
    "Parafin",
    "B",
    "Single choice",
    "Crospovidon là tá dược siêu rã thường dùng trong viên nén.",
  ],
  [
    "Các trường nào cần có trong file Excel để tạo quiz?",
    "Câu hỏi",
    "Đáp án A-D",
    "Đáp án đúng",
    "Ảnh đại diện",
    "A;B;C",
    "Multiple choice",
    "File cần câu hỏi, các lựa chọn và đáp án đúng; ảnh đại diện không bắt buộc.",
  ],
  [
    "Quiz có thể được xuất ra định dạng nào?",
    "PDF",
    "Link online",
    "JSON",
    "Tất cả đều đúng",
    "D",
    "Single choice",
    "Hệ thống hiện ưu tiên link online và JSON, các định dạng khác có thể mở rộng.",
  ],
  ["2 + 2 = ?", "3", "4", "5", "6", "B", "Single choice", "2 + 2 bằng 4."],
  ["Thủ đô của Việt Nam là?", "Hà Nội", "TP.HCM", "Đà Nẵng", "Huế", "A", "Single choice", "Hà Nội là thủ đô của Việt Nam."],
  ["Màu của bầu trời vào ngày nắng thường là?", "Xanh", "Đỏ", "Vàng", "Tím", "A", "Single choice", "Ánh sáng tán xạ khiến bầu trời thường có màu xanh."],
  ["Python là gì?", "Ngôn ngữ lập trình", "Con rắn", "Thương hiệu", "Tất cả đều đúng", "D", "Single choice", "Python vừa là tên ngôn ngữ lập trình, vừa là tên một loài rắn và có thể là tên thương hiệu."],
  ["React là?", "Library JavaScript", "Framework", "Database", "Server", "A", "Single choice", "React là thư viện JavaScript để xây dựng giao diện người dùng."],
  ["MongoDB là?", "SQL Database", "NoSQL Database", "Programming Language", "Framework", "B", "Single choice", "MongoDB là cơ sở dữ liệu NoSQL hướng document."],
  ["1 + 1 = ?", "1", "2", "3", "4", "B", "Single choice", "1 + 1 bằng 2."],
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(quizData);

worksheet["!cols"] = [
  { wch: 60 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 35 },
  { wch: 18 },
  { wch: 70 },
];

XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Template");

const outputPath = path.join(__dirname, "../frontend/public/quiz-template.xlsx");
XLSX.writeFile(workbook, outputPath);

console.log(`File Excel mẫu đã được tạo: ${outputPath}`);
