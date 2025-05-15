import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { FileUpload } from '@/components/ui/file-upload';
import { Image, Send, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { uploadMultipleFiles } from '@/lib/uploadAPI';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { MentionList } from './mention-list';

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
  const [mentionSearch, setMentionSearch] = useState('');
  const [isMentioning, setIsMentioning] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { onlineUsers } = useWebSocket();
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);
  
  // Xử lý gợi ý người dùng khi gõ @
  useEffect(() => {
    const regex = /@(\w*)$/;
    const match = message.substring(0, textareaRef.current?.selectionStart || message.length).match(regex);
    
    if (match) {
      const searchTerm = match[1].toLowerCase();
      setMentionSearch(searchTerm);
      setIsMentioning(true);
      setMentionPosition({
        start: match.index || 0,
        end: (match.index || 0) + match[0].length
      });
    } else {
      setIsMentioning(false);
    }
  }, [message]);
  
  // Lọc người dùng phù hợp với từ khóa tìm kiếm
  const filteredUsers = isMentioning 
    ? onlineUsers.filter(user => 
        user.username.toLowerCase().includes(mentionSearch.toLowerCase())
      )
    : [];
    
  // Chọn một người dùng trong danh sách gợi ý
  const handleSelectUser = (username: string) => {
    const before = message.substring(0, mentionPosition.start);
    const after = message.substring(mentionPosition.end);
    setMessage(`${before}@${username} ${after}`);
    setIsMentioning(false);
    
    // Focus lại vào textarea và đặt con trỏ sau tên người dùng
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = mentionPosition.start + username.length + 2; // @ + username + space
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Nếu đang hiển thị gợi ý và nhấn Tab hoặc Enter, chọn người dùng đầu tiên
    if (isMentioning && filteredUsers.length > 0 && (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey))) {
      e.preventDefault();
      handleSelectUser(filteredUsers[0].username);
      return;
    }
    
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && !isMentioning) {
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
        media = await uploadMultipleFiles(files, type);
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
      <div className="flex items-center space-x-2">
        <div className="flex-1 min-h-[40px]">
          <div className="relative bg-gray-100 dark:bg-gray-800/60 rounded-full pr-10">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="resize-none min-h-[40px] py-2 px-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full bg-transparent"
              disabled={disabled}
              style={{
                maxHeight: '120px',
                overflowY: 'auto'
              }}
            />
            
            {isMentioning && (
              <MentionList users={filteredUsers} onSelect={handleSelectUser} />
            )}
            
            <div className="absolute bottom-1.5 right-3 flex items-center gap-1">
              <Popover open={showFileUpload} onOpenChange={setShowFileUpload}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                    disabled={disabled}
                  >
                    <Image className="h-4 w-4" />
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
        </div>
        
        <Button 
          onClick={handleSend} 
          size="icon" 
          disabled={isOverLimit || (!message.trim() && files.length === 0) || disabled || isUploading}
          className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isUploading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <Send className="h-4.5 w-4.5" />
          )}
        </Button>
      </div>
      
      {/* Character counter */}
      {charCount > 0 && (
        <div className="flex justify-end mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${isOverLimit ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : 'text-gray-500 dark:text-gray-400'}`}>
            {charCount}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}