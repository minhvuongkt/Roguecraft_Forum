import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { FileUpload } from '@/components/ui/file-upload';
import { Image, Send, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { uploadMultipleFiles } from '@/lib/uploadAPI';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSend: (message: string, media?: any) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  type?: 'chat' | 'topic';
}

export function MessageInput({ 
  onSend, 
  placeholder = 'Nhập tin nhắn...', 
  maxLength = 1000,
  disabled = false,
  type = 'chat'
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleAddEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };
  
  const handleFileSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
  };
  
  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage && files.length === 0) return;
    
    try {
      let media = undefined;
      
      // Nếu có file, upload trước khi gửi tin nhắn
      if (files.length > 0) {
        setIsUploading(true);
        const uploadedMedia = await uploadMultipleFiles(files, type);
        media = uploadedMedia.length === 1 ? uploadedMedia[0] : uploadedMedia;
        setIsUploading(false);
      }
      
      // Gửi tin nhắn với media đã upload
      onSend(trimmedMessage, media);
      
      // Reset form
      setMessage('');
      setFiles([]);
      setShowFileUpload(false);
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Lỗi upload file:', error);
      setIsUploading(false);
      toast({
        title: 'Lỗi upload file',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải file',
        variant: 'destructive',
      });
    }
  };
  
  const charCount = message.length;
  const isOverLimit = charCount > maxLength;
  
  return (
    <div className="relative">
      <div className="flex items-start space-x-2">
        <div className="flex-1 min-h-[40px]">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="resize-none min-h-[40px] py-2 pr-12"
            disabled={disabled}
          />
          
          <div className="absolute bottom-2 right-12 flex items-center space-x-1">
            <Popover open={showFileUpload} onOpenChange={setShowFileUpload}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  <Image className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <FileUpload 
                  onFileSelect={handleFileSelect}
                  value={files}
                />
              </PopoverContent>
            </Popover>
            
            <EmojiPicker onSelect={handleAddEmoji} />
          </div>
        </div>
        
        <Button 
          onClick={handleSend} 
          size="icon" 
          disabled={isOverLimit || (!message.trim() && files.length === 0) || disabled || isUploading}
          className="h-10 w-10 rounded-full"
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      {/* Character counter */}
      <div className="flex justify-end mt-1">
        <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {charCount}/{maxLength}
        </span>
      </div>
    </div>
  );
}
