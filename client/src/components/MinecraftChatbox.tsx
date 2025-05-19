import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Paperclip, Send, X } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';

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
  placeholder = "Nhập gì đó đê...",
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
  const { theme } = useTheme();
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/uploads/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file');
      }

      const fileType = file.type.startsWith('image/') ? 'image' : 'file';
      let fileUrl = data["1"]; // Lấy giá trị của khóa "1"
      if (!fileUrl && data["image"]) {
        fileUrl = data["image"];
      }
      if (fileUrl) {
        const mediaObj = { image: fileUrl };
        setFilePreview({ url: fileUrl, type: fileType });
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
    const mediaData = uploadedMedia || (filePreview ? { image: filePreview.url } : undefined);
    onSend(trimmedMessage, mediaData);
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

  const panelStyle = theme === 'dark'
    ? { backgroundColor: '#181818', border: '2px solid #555', color: '#fff' }
    : { backgroundColor: '#f3f3f3', border: '2px solid #bbb', color: '#222' };
  const inputStyle = theme === 'dark'
    ? { backgroundColor: '#181818', border: '2px solid #555', color: '#fff', fontFamily: "'VT323', monospace", fontSize: '18px' }
    : { backgroundColor: '#fff', border: '2px solid #bbb', color: '#222', fontFamily: "'VT323', monospace", fontSize: '18px' };

  return (
    <div className={cn('relative w-full', className)}>
      {replyPreview && (
        <div className="mb-2">
          {replyPreview}
        </div>
      )}

      {typingIndicator && (
        <div className="mb-1">{typingIndicator}</div>
      )}
      {!disabled && (
        <div className="flex flex-col minecraft-chat-container" style={{ ...panelStyle, borderRadius: '8px' }}
        >
          {filePreview && (
            <div
              className="relative p-2 border-b"
              style={theme === 'dark' ? { borderColor: '#333' } : { borderColor: '#ccc' }}
            >
              {filePreview.type === 'image' ? (
                <div className="relative w-32 h-32">
                  <img
                    src={filePreview.url}
                    alt="Preview"
                    className="minecraft-pixelated-image w-full h-full object-cover"
                  />
                  <button
                    className="absolute -top-2 -right-2 minecraft-styled-button p-1"
                    onClick={clearFilePreview}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    'flex items-center border p-2',
                    theme === 'dark'
                      ? 'bg-[#181818] border-[#555]'
                      : 'bg-[#fff] border-[#bbb]'
                  )}
                >
                  <span
                    className={cn(
                      'truncate mr-2 minecraft-font',
                      theme === 'dark' ? 'text-white' : 'text-black'
                    )}
                  >
                    {filePreview.url.split('/').pop()}
                  </span>
                  <button
                    className="minecraft-button p-1"
                    onClick={clearFilePreview}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 p-1" style={{ background: 'transparent', border: 'none' }}>
            {/* Ô nhập */}
            <div className="flex-1 relative">
              <textarea
                ref={textAreaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  "minecraft-chat-input resize-none w-full",
                  theme === 'dark' ? 'text-white' : 'text-black'
                )}
                rows={1}
                style={{
                  ...inputStyle,
                  backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                  minHeight: 44,
                }}
              />
            </div>
            <label className="cursor-pointer flex items-center mb-1" title="Đính kèm tệp">
              <Paperclip
                size={20}
                className={theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*"
                disabled={uploading}
              />
            </label>
            <button
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && !filePreview) || uploading}
              className={cn(
                'minecraft-styled-button flex items-center justify-center h-10 w-10',
                theme === 'dark'
                  ? 'bg-[#222c18] text-white border border-[#444] hover:bg-[#2a3418]'
                  : 'bg-[#eee] text-black border border-[#bbb] hover:bg-[#fbe98a]'
              )}
              style={{
                borderRadius: '4px',
                transition: 'opacity 0.2s',
                minWidth: 40,
                minHeight: 40,
                fontSize: '1.2rem'
              }}
              type="button"
              title="Gửi"
            >
              {uploading ? (
                <div className="flex items-center">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                  <span className="minecraft-font" style={{ fontSize: '1rem' }}>...</span>
                </div>
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      )}

      {colorPicker && (
        <div className="mt-1">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={cn('text-xs minecraft-font transition-colors hover:bg-opacity-10', theme === 'dark' ? 
              'text-blue-400 hover:text-white hover:bg-white' : 'text-blue-700 hover:text-black hover:bg-black')}
            style={{ background: 'transparent', border: 'none', padding: '4px 8px', color: theme === 'dark' ?
               'white' : 'black' }}
          >
            {showColorPicker ? 'Ẩn bảng màu' : 'Chọn màu tin nhắn'}
          </button>

          {showColorPicker && (
            <div className="p-1 mt-1 minecraft-chat-container" style={panelStyle}>
              {colorPicker}
            </div>
          )}
        </div>
      )}
    </div>
  );
}