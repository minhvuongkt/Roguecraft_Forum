import React from 'react';
import { X } from 'lucide-react';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

interface MessengerReplyIndicatorProps {
  message: ChatMessage;
  onCancel: () => void;
}

export function MessengerReplyIndicator({ message, onCancel }: MessengerReplyIndicatorProps) {
  // Hàm để rút gọn nội dung tin nhắn nếu quá dài
  const truncateContent = (content: string, maxLength = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="flex items-center py-2 px-3 bg-gray-800 rounded-md mb-2 messenger-reply-animation">
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <div className="w-1 h-6 bg-blue-500 rounded-full mr-2" />
          <div>
            <p className="text-xs text-gray-400">
              Đang trả lời {message.user?.username || 'Người dùng'}
            </p>
            <p className={cn(
              "text-sm text-gray-300 truncate max-w-full",
              "minecraft-font"
            )}>
              {message.content ? truncateContent(message.content) : 'Media'}
            </p>
          </div>
        </div>
      </div>
      
      <button
        onClick={onCancel}
        className="ml-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Cancel reply"
      >
        <X size={18} />
      </button>
    </div>
  );
}