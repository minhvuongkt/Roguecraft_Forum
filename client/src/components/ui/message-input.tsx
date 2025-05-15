import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { FileUpload } from '@/components/ui/file-upload';
import { Image, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MessageInputProps {
  onSend: (message: string, files?: File[]) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function MessageInput({ 
  onSend, 
  placeholder = 'Nhập tin nhắn...', 
  maxLength = 1000,
  disabled = false
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  const handleSend = () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage && files.length === 0) return;
    
    onSend(trimmedMessage, files.length > 0 ? files : undefined);
    setMessage('');
    setFiles([]);
    setShowFileUpload(false);
    textareaRef.current?.focus();
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
          disabled={isOverLimit || (!message.trim() && files.length === 0) || disabled}
          className="h-10 w-10 rounded-full"
        >
          <Send className="h-5 w-5" />
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
