import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/hooks/use-toast';
import { useForum } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { uploadMultipleFiles } from '@/lib/uploadAPI';
import "../assets/minecraft-styles.css";

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTopicModal({ isOpen, onClose }: CreateTopicModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const { toast } = useToast();
  const { createTopic } = useForum();
  const { user } = useAuth();

  const handleClose = () => {
    setTitle('');
    setContent('');
    setIsAnonymous(false);
    setFiles([]);
    setIsUploading(false);
    setIsSubmitting(false);
    setSelectedCategory('Tất cả');
    onClose();
  };

  const handleFileSelect = (newFiles: File[]) => {
    setFiles(newFiles);
  };
  const handleCreateTopic = async () => {
    // Detailed validation with better error messages
    if (!title.trim()) {
      toast({
        title: 'Thiếu tiêu đề',
        description: 'Vui lòng nhập tiêu đề cho bài viết',
        variant: 'destructive',
      });
      return;
    }

    if (title.length > 250) {
      toast({
        title: 'Tiêu đề quá dài',
        description: 'Tiêu đề không được quá 250 ký tự',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Thiếu nội dung',
        description: 'Vui lòng nhập nội dung cho bài viết',
        variant: 'destructive',
      });
      return;
    }
    
    if (content.length > 9500) {
      toast({
        title: 'Nội dung quá dài',
        description: 'Nội dung không được quá 9500 ký tự',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if user is logged in
    if (!user || !user.id) {
      toast({
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập để tạo bài viết',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let media = null;      // Nếu có file, upload trước
      if (files.length > 0) {
        setIsUploading(true);
        try {
          media = await uploadMultipleFiles(files, 'topic');
          console.log('Files uploaded successfully:', media);
        } catch (error) {
          console.error('Failed to upload files:', error);
          toast({
            title: 'Lỗi khi tải ảnh',
            description: 'Không thể tải ảnh lên server',
            variant: 'destructive',
          });
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }      try {
        console.log('Creating topic with data:', {
          title: title.trim().substring(0, 50),
          contentLength: content.trim().length,
          category: selectedCategory,
          isAnonymous,
          mediaPresent: media ? 'yes' : 'no',
          mediaType: media ? typeof media : 'null'
        });
        
        // Xử lý media để đảm bảo nó có định dạng đúng
        let processedMedia = null;
        if (media) {
          // Kiểm tra xem media có đúng định dạng không
          if (typeof media === 'object' && !Array.isArray(media) && media !== null) {
            // Kiểm tra xem các giá trị có phải là string không
            let isValid = true;
            Object.entries(media).forEach(([key, value]) => {
              if (typeof value !== 'string') {
                console.warn(`Media key ${key} has a non-string value, fixing`);
                isValid = false;
              }
            });
            
            if (isValid) {
              processedMedia = media;
            } else {
              // Chuyển đổi tất cả giá trị thành string
              processedMedia = Object.fromEntries(
                Object.entries(media).map(([key, value]) => [key, String(value)])
              );
            }
          } else {
            console.warn('Media is not in expected format, setting to null');
          }
        }
        
        // Create a debug object for better error messages
        const topicData = {
          title: title.trim(),
          content: content.trim(),
          isAnonymous,
          category: selectedCategory || 'Tất cả',
          media: processedMedia,
        };
        
        console.log('Topic data ready for submission');
        
        await createTopic(topicData);
        console.log('Topic created successfully');
      } catch (error) {
        console.error('Error creating topic:', error);
        let errorMessage = 'Đã xảy ra lỗi khi tạo bài viết';
        
        if (error instanceof Error) {
          // Trích xuất phần lỗi quan trọng nhất
          const errorDetails = error.message;
          
          console.log('Error details:', errorDetails);
          
          // Xử lý các mã lỗi khác nhau
          if (errorDetails.includes('413') || errorDetails.includes('Content too long')) {
            errorMessage = 'Bài viết quá lớn. Vui lòng giảm kích thước nội dung hoặc số lượng hình ảnh.';
          } else if (errorDetails.includes('401') || errorDetails.includes('Unauthorized')) {
            errorMessage = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
          } else if (errorDetails.includes('Invalid media format')) {
            errorMessage = 'Định dạng file không hợp lệ. Chỉ chấp nhận ảnh PNG, JPG hoặc GIF.';
          } else if (errorDetails.includes('Validation failed')) {
            errorMessage = 'Dữ liệu không hợp lệ: ' + errorDetails;
          } else if (errorDetails.includes('connect')) {
            errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối của bạn.';
          } else if (errorDetails.includes('Network') || errorDetails.includes('Failed to fetch')) {
            errorMessage = 'Lỗi mạng. Vui lòng kiểm tra kết nối internet của bạn và thử lại.';
          } else {
            // Hiển thị chi tiết lỗi nếu có
            errorMessage += ': ' + error.message;
          }
        }
        
        toast({
          title: 'Lỗi tạo bài viết',
          description: errorMessage,
          variant: 'destructive',
        });
        
        setIsSubmitting(false); // Reset submit state
        return; // Don't proceed to success path
      }

      toast({
        title: 'Tạo bài viết thành công',
        description: 'Bài viết của bạn đã được đăng',
      });

      handleClose();
    } catch (error) {
      console.error('Failed to create topic:', error);
      toast({
        title: 'Lỗi khi tạo bài viết',
        description:
          'Đã có lỗi xảy ra khi tạo bài viết. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['Tất cả', 'Survival', 'Creative', 'Mods', 'Redstone', 'PvP', 'Servers'];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="minecraft-card sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="minecraft-title text-2xl">Tạo Topic Mới</DialogTitle>
          <DialogDescription className="minecraft-text">
            Chia sẻ kiến thức, đặt câu hỏi hoặc thảo luận với cộng đồng
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tiêu đề */}
          <div className="space-y-2">
            <Label htmlFor="title" className="font-['VT323'] text-lg text-[#ffff55]">Tiêu đề</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài viết"
              className="bg-[#333] border-2 border-t-[#6b6b6b] border-l-[#6b6b6b] border-r-[#2d2d2d] border-b-[#2d2d2d] font-['VT323'] text-base"
            />
          </div>

          {/* Nội dung */}
          <div className="space-y-2">
            <Label htmlFor="content" className="font-['VT323'] text-lg text-[#ffff55]">Nội dung</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung bài viết..."
              className="bg-[#333] border-2 border-t-[#6b6b6b] border-l-[#6b6b6b] border-r-[#2d2d2d] border-b-[#2d2d2d] font-['VT323'] text-base min-h-[150px]"
            />
          </div>

          {/* Danh mục */}
          {/* <div className="space-y-2">
            <Label className="font-['VT323'] text-lg text-[#ffff55]">Danh mục</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant="minecraft"
                  size="sm"
                  className={`${
                    selectedCategory === category ? 'border-[#ffff55]' : ''
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  <span className="font-['VT323']">{category}</span>
                </Button>
              ))}
            </div>
          </div> */}

          {/* Hình ảnh */}
          <div className="space-y-2">
            <Label className="font-['VT323'] text-lg text-[#ffff55]">Hình ảnh (không bắt buộc)</Label>
            <FileUpload
              onFileSelect={handleFileSelect}
              maxFiles={4}
              acceptedTypes="image/*"
              maxSizeMB={5}
              value={files}
              className="bg-[#333] border-2 border-t-[#6b6b6b] border-l-[#6b6b6b] border-r-[#2d2d2d] border-b-[#2d2d2d]"
            />
          </div>

          {/* Đăng ẩn danh */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(!!checked)}
            />
            <Label htmlFor="anonymous" className="font-['VT323'] text-lg">Đăng ẩn danh</Label>
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="minecraft" onClick={handleClose} className="w-full sm:w-auto">
            <span className="font-['VT323']">Huỷ</span>
          </Button>
          <Button
            variant="minecraft"
            onClick={handleCreateTopic}
            disabled={isSubmitting || isUploading}
            className="w-full sm:w-auto border-[#55ff55]"
          >
            <span className="font-['VT323']">
              {isSubmitting || isUploading ? 'Đang tạo...' : 'Tạo topic'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}