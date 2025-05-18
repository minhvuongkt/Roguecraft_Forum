import React from 'react';
import { X } from 'lucide-react';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

interface MessengerReplyIndicatorProps {
  message: ChatMessage;
  onCancel: () => void;
  className?: string;
}

export function MessengerReplyIndicator({ 
  message, 
  onCancel,
  className 
}: MessengerReplyIndicatorProps) {
  const truncateContent = (content: string, maxLength = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className={cn(
      "flex items-center py-2 px-3 minecraft-panel mb-2 messenger-reply-animation",
      className
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <div className="w-1 h-6 bg-green-500 mr-2" />
          <div>
            <p className="minecraft-font text-yellow-300">
              Đang trả lời {message.user?.username || 'Người dùng'}
            </p>
            <p className="minecraft-font text-white truncate max-w-full">
              {message.content ? truncateContent(message.content) : 'Media'}
            </p>
          </div>
        </div>
      </div>
      
      <button
        onClick={onCancel}
        className="minecraft-styled-button ml-2"
        aria-label="Cancel reply"
      >
        <X size={18} />
      </button>
    </div>
  );
}