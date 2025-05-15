import { Request, Response, Router } from 'express';
import { chatUpload, topicUpload } from '../middleware/fileUpload';
import path from 'path';

const router = Router();

// Upload route for chat images
router.post('/chat', chatUpload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được gửi lên' });
    }
    
    // Return media object with proper URL
    res.json({
      url: `/chat-images/${req.file.filename}`,
      type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading chat file:', error);
    res.status(500).json({ error: 'Lỗi khi tải lên file' });
  }
});

// Upload route for topic images
router.post('/topic', topicUpload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được gửi lên' });
    }
    
    // Return media object with proper URL
    res.json({
      url: `/topic-images/${req.file.filename}`,
      type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading topic file:', error);
    res.status(500).json({ error: 'Lỗi khi tải lên file' });
  }
});

export default router;