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

  const { createTopic, isCreatingTopic } = useForum();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Bạn cần đăng nhập để tạo bài viết',
        variant: 'destructive',
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập đầy đủ tiêu đề và nội dung',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      let media = undefined;
      if (files.length > 0) {
        try {
          toast({
            title: 'Đang tải lên hình ảnh',
            description: 'Vui lòng đợi trong giây lát...'
          });
          media = await uploadMultipleFiles(files, 'topic');
        } catch (uploadError) {
          toast({
            title: 'Lỗi upload file',
            description: uploadError instanceof Error ? uploadError.message : 'Đã xảy ra lỗi khi tải file',
            variant: 'destructive',
          });
          setIsUploading(false);
          return;
        }
      }

      try {
        await createTopic({
          title,
          content,
          category: "Survival", // Luôn mặc định là Survival
          isAnonymous,
          media
        });

        toast({
          title: 'Thành công',
          description: 'Bài viết đã được tạo thành công',
        });

        handleClose();
      } catch (createError) {
        toast({
          title: 'Lỗi tạo bài viết',
          description: createError instanceof Error ? createError.message : 'Đã xảy ra lỗi khi tạo bài viết',
          variant: 'destructive',
        });
      }
      setIsUploading(false);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: 'Lỗi',
        description: 'Đã xảy ra lỗi không xác định',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setIsAnonymous(false);
    setFiles([]);
    onClose();
  };

  const handleFileSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo Topic Mới</DialogTitle>
          <DialogDescription>
            Chia sẻ câu hỏi, thảo luận hoặc bài viết của bạn với các đồng râm
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài viết"
                required
                disabled={isCreatingTopic}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Nội dung</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung bài viết"
                className="min-h-[120px]"
                required
                disabled={isCreatingTopic}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(!!checked)}
                disabled={isUploading || isCreatingTopic}
              />
              <Label htmlFor="anonymous" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Đăng ẩn danh
              </Label>
            </div>

            <FileUpload
              onFileSelect={handleFileSelect}
              value={files}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading || isCreatingTopic}>
              Hủy
            </Button>
            <Button type="submit" disabled={isUploading || isCreatingTopic}>
              {isUploading ? 'Đang tải lên...' : isCreatingTopic ? 'Đang đăng...' : 'Đăng bài'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}