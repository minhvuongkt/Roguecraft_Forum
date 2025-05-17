import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Paperclip, Send, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MinecraftChatboxProps {
  onSend: (message: string, media?: any) => void;
  disabled?: boolean;
  placeholder?: string;
  replyPreview?: React.ReactNode;
  colorPicker?: React.ReactNode;
  typingIndicator?: React.ReactNode;
  className?: string;
}

export function MinecraftChatbox({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  replyPreview,
  colorPicker,
  typingIndicator,
  className,
}: MinecraftChatboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState<{ url: string; type: string } | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Tập tin quá lớn",
        description: "Kích thước tập tin không được vượt quá 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create a FormData instance and append the file
      const formData = new FormData();
      formData.append('file', file);

      // Upload the file to the server
      const response = await fetch('/api/uploads/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file');
      }

      // Determine file type
      const fileType = file.type.startsWith('image/') ? 'image' : 'file';
      
      // Lấy URL từ phản hồi - API có thể trả về dạng {"1": "/chat-images/filename.jpg"} hoặc {"image": "/chat-images/filename.jpg"}
      let fileUrl = data["1"]; // Lấy giá trị của khóa "1"
      
      // Nếu không có key "1" thì kiểm tra key "image"
      if (!fileUrl && data["image"]) {
        fileUrl = data["image"];
      }
      
      if (fileUrl) {
        // Thống nhất định dạng cho client - luôn dùng key "image" để lưu ảnh
        const mediaObj = { image: fileUrl };
        setFilePreview({ url: fileUrl, type: fileType });
        
        // Lưu media vào state theo định dạng thống nhất
        setUploadedMedia(mediaObj);
      } else {
        console.error('Invalid response format:', data);
        toast({
          title: "Lỗi định dạng",
          description: "Phản hồi từ server không đúng định dạng",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Lỗi tải lên",
        description: "Không thể tải tập tin lên máy chủ",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFilePreview = () => {
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = () => {
    if (disabled) return;

    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage && !filePreview) return;

    // Sử dụng uploadedMedia đã được thiết lập trong quá trình tải lên
    // Nếu không có media đã upload, sử dụng filePreview nếu có
    const mediaData = uploadedMedia || (filePreview ? { image: filePreview.url } : undefined);
    onSend(trimmedMessage, mediaData);
    // Reset all states
    setInputValue("");
    setFilePreview(null);
    setUploadedMedia(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      {replyPreview && (
        <div className="mb-2">{replyPreview}</div>
      )}
      
      {typingIndicator && (
        <div className="mb-1">{typingIndicator}</div>
      )}
      
      <div className="flex flex-col bg-gray-800 border-2 border-gray-700 rounded-md overflow-hidden">
        {filePreview && (
          <div className="relative p-2 bg-gray-900">
            {filePreview.type === 'image' ? (
              <div className="relative w-32 h-32">
                <img 
                  src={filePreview.url} 
                  alt="Preview" 
                  className="w-full h-full object-cover rounded-md"
                />
                <button 
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                  onClick={clearFilePreview}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-gray-800 rounded-md p-2">
                <span className="text-white truncate mr-2">{filePreview.url.split('/').pop()}</span>
                <button 
                  className="bg-red-500 text-white rounded-full p-1"
                  onClick={clearFilePreview}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-end p-2">
          <div className="flex-1 relative">
            <textarea
              ref={textAreaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full p-2 pr-10 bg-gray-900 text-white border-none rounded-md resize-none 
                         focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] max-h-[120px] minecraft-font"
              rows={1}
            />
            
            <label className="absolute bottom-2 right-2 cursor-pointer">
              <Paperclip 
                size={18} 
                className="text-gray-400 hover:text-white transition-colors"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.docx,.xlsx,.txt"
                disabled={disabled || uploading}
              />
            </label>
          </div>
          
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={disabled || (!inputValue.trim() && !filePreview) || uploading}
            className="ml-2 bg-green-600 hover:bg-green-700 gaming-font px-3 py-2 h-auto"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
      
      {colorPicker && (
        <div className="mt-2">
          <button 
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="text-xs text-gray-400 hover:text-white mb-1"
          >
            {showColorPicker ? 'Ẩn bảng màu' : 'Chọn màu tin nhắn'}
          </button>
          
          {showColorPicker && (
            <div className="p-2 bg-gray-800 border border-gray-700 rounded-md">
              {colorPicker}
            </div>
          )}
        </div>
      )}
    </div>
  );
}