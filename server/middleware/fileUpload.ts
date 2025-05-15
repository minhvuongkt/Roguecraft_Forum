import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure directories exist with absolute paths
const chatUploadDir = path.resolve('./public/chat-images');
const topicUploadDir = path.resolve('./public/topic-images');

console.log('Chat upload directory path:', chatUploadDir);
console.log('Topic upload directory path:', topicUploadDir);

// Create directories if they don't exist
if (!fs.existsSync(chatUploadDir)) {
  console.log('Creating chat images directory');
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

if (!fs.existsSync(topicUploadDir)) {
  console.log('Creating topic images directory');
  fs.mkdirSync(topicUploadDir, { recursive: true });
}

// Verify directories exist and are writable
try {
  const chatTestPath = path.join(chatUploadDir, 'test.txt');
  fs.writeFileSync(chatTestPath, 'Test file for chat uploads');
  console.log('Chat directory is writable, test file created at:', chatTestPath);
  fs.unlinkSync(chatTestPath);
  
  const topicTestPath = path.join(topicUploadDir, 'test.txt');
  fs.writeFileSync(topicTestPath, 'Test file for topic uploads');
  console.log('Topic directory is writable, test file created at:', topicTestPath);
  fs.unlinkSync(topicTestPath);
} catch (error) {
  console.error('Error testing directory write permissions:', error);
}

// Configure storage for each type
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Đảm bảo thư mục tồn tại trước khi lưu file
    if (!fs.existsSync(chatUploadDir)) {
      console.log(`Creating chat directory on demand: ${chatUploadDir}`);
      fs.mkdirSync(chatUploadDir, { recursive: true });
    }
    cb(null, chatUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const filename = `chat-${uniqueSuffix}${ext}`;
    console.log(`Creating chat file: ${filename} in ${chatUploadDir}`);
    cb(null, filename);
  }
});

const topicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Đảm bảo thư mục tồn tại trước khi lưu file
    if (!fs.existsSync(topicUploadDir)) {
      console.log(`Creating topic directory on demand: ${topicUploadDir}`);
      fs.mkdirSync(topicUploadDir, { recursive: true });
    }
    cb(null, topicUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    const filename = `topic-${uniqueSuffix}${ext}`;
    console.log(`Creating topic file: ${filename} in ${topicUploadDir}`);
    cb(null, filename);
  }
});

// File filter to check file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4', 
    'video/webm'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Không hỗ trợ định dạng file này'));
  }
};

// Create upload handlers
export const chatUpload = multer({
  storage: chatStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter
});

export const topicUpload = multer({
  storage: topicStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter
});