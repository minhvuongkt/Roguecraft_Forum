import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from 'lucide-react';
import { ChatMessage } from '@/types';

interface ReplyPreviewProps {
  message: ChatMessage;
  onCancel: () => void;
}

export function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  // Lấy nội dung trích dẫn từ tin nhắn gốc, tối đa 40 ký tự
  const quoteContent = message.content.length > 40
    ? message.content.substring(0, 40) + '...'
    : message.content;

  return (
    <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 mb-2">
      <div className="flex-1 flex items-center gap-2">
        {/* Avatar của người gửi tin nhắn gốc */}
        <Avatar className="h-6 w-6">
          {message.user?.avatar ? (
            <AvatarImage src={message.user.avatar} alt={message.user?.username || 'User'} />
          ) : (
            <AvatarFallback className="text-xs bg-blue-500 text-white">
              {message.user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-corner-up-left">
              <polyline points="9 14 4 9 9 4"></polyline>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
            </svg>
            Đang trả lời {message.user?.username}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-300 font-light italic">
            {quoteContent}
          </span>
        </div>
      </div>
      
      <button 
        onClick={onCancel}
        className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Hủy trả lời"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}