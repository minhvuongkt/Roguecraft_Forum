import { Request, Response, Router } from 'express';
import { chatUpload, topicUpload } from '../middleware/fileUpload';
import path from 'path';
import fs from 'fs';

const router = Router();

// Đảm bảo thư mục tồn tại
const ensureDirectoriesExist = () => {
  const chatUploadDir = './public/chat-images';
  const topicUploadDir = './public/topic-images';
  
  if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
  }
  
  if (!fs.existsSync(topicUploadDir)) {
    fs.mkdirSync(topicUploadDir, { recursive: true });
  }
};

ensureDirectoriesExist();

// Upload route for chat images - single file
router.post('/chat', chatUpload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được gửi lên' });
    }
    
    // Tạo đường dẫn URL đến file
    const fileUrl = `/chat-images/${req.file.filename}`;
    
    // Tạo định dạng JSON mới cho media
    const mediaObject = {
      "1": fileUrl
    };
    
    console.log("Chat upload media:", mediaObject);
    
    // Trả về kết quả theo định dạng mới
    res.json(mediaObject);
  } catch (error) {
    console.error('Error uploading chat file:', error);
    res.status(500).json({ error: 'Lỗi khi tải lên file' });
  }
});

// Upload route for multiple chat images
router.post('/chat/multiple', chatUpload.array('files', 5), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Không có file được gửi lên' });
    }
    
    // Tạo đối tượng media theo định dạng mới
    const mediaObject: Record<string, string> = {};
    
    files.forEach((file, index) => {
      mediaObject[(index + 1).toString()] = `/chat-images/${file.filename}`;
    });
    
    console.log("Chat multiple upload media:", mediaObject);
    
    // Trả về đối tượng media
    res.json(mediaObject);
  } catch (error) {
    console.error('Error uploading multiple chat files:', error);
    res.status(500).json({ error: 'Lỗi khi tải lên nhiều file' });
  }
});

// Upload route for topic images - single file
router.post('/topic', topicUpload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được gửi lên' });
    }
    
    // Tạo đường dẫn URL đến file
    const fileUrl = `/topic-images/${req.file.filename}`;
    
    // Tạo định dạng JSON mới cho media
    const mediaObject = {
      "1": fileUrl
    };
    
    console.log("Topic upload media:", mediaObject);
    
    // Trả về kết quả theo định dạng mới
    res.json(mediaObject);
  } catch (error) {
    console.error('Error uploading topic file:', error);
    res.status(500).json({ error: 'Lỗi khi tải lên file' });
  }
});

// Upload route for multiple topic images
router.post('/topic/multiple', topicUpload.array('files', 5), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Không có file được gửi lên' });
    }
    
    // Tạo đối tượng media theo định dạng mới
    const mediaObject: Record<string, string> = {};
    
    files.forEach((file, index) => {
      mediaObject[(index + 1).toString()] = `/topic-images/${file.filename}`;
    });
    
    console.log("Topic multiple upload media:", mediaObject);
    
    // Trả về đối tượng media
    res.json(mediaObject);
  } catch (error) {
    console.error('Error uploading multiple topic files:', error);
    res.status(500).json({ error: 'Lỗi khi tải lên nhiều file' });
  }
});

export default router;