import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure directories exist
const chatUploadDir = './public/chat-images';
const topicUploadDir = './public/topic-images';

// Create directories if they don't exist
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

if (!fs.existsSync(topicUploadDir)) {
  fs.mkdirSync(topicUploadDir, { recursive: true });
}

// Configure storage for each type
const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `chat-${uniqueSuffix}${ext}`);
  }
});

const topicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, topicUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `topic-${uniqueSuffix}${ext}`);
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