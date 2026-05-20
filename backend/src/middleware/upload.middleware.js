import multer from "multer";
import path from "path";

// Configure multer for memory storage
const storage = multer.memoryStorage();

const createExtensionFilter = (allowedExtensions, message) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(message), false);
  }
};

const uploadExcelMulter = multer({
  storage,
  fileFilter: createExtensionFilter(
    [".xlsx", ".xls", ".csv"],
    "Invalid file type. Only Excel files (.xlsx, .xls, .csv) are allowed.",
  ),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const uploadDocumentMulter = multer({
  storage,
  fileFilter: createExtensionFilter(
    [".pdf"],
    "Invalid file type. Only PDF files (.pdf) are allowed.",
  ),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

export const uploadExcel = uploadExcelMulter.single("file");
export const uploadDocument = uploadDocumentMulter.single("file");
