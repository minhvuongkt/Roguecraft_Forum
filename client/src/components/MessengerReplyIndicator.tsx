import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types";
import { Reply } from 'lucide-react';

interface MessengerReplyIndicatorProps {
  message: ChatMessage;
  onCancel: () => void;
}

export function MessengerReplyIndicator({ message, onCancel }: MessengerReplyIndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Thêm hiệu ứng highlight khi component được render
    if (indicatorRef.current) {
      indicatorRef.current.classList.add('bg-purple-500/10');
      setTimeout(() => {
        if (indicatorRef.current) {
          indicatorRef.current.classList.remove('bg-purple-500/10');
        }
      }, 1000);
    }
  }, []);

  // Cắt ngắn nội dung nếu quá dài
  const displayContent = message.content.length > 35
    ? message.content.substring(0, 35) + '...'
    : message.content;

  return (
    <motion.div
      ref={indicatorRef}
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="px-3 py-2 messenger-reply-animation border-l-4 border-purple-500 bg-gray-800 flex items-center gap-2 transition-all duration-300"
    >
      <div className="flex-1 flex items-center gap-2">
        <Avatar className="h-6 w-6">
          {message.user?.avatar ? (
            <AvatarImage src={message.user.avatar} alt={message.user?.username || 'User'} />
          ) : (
            <AvatarFallback className="text-xs bg-purple-600 text-white">
              {message.user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Reply className="h-3 w-3 text-purple-400" />
            <span className="text-purple-400 font-medium">Đang trả lời {message.user?.username}</span>
          </div>
          <p className="text-xs text-white bg-purple-900/30 px-2 py-1 mt-1 rounded">
            {displayContent}
          </p>
        </div>
      </div>
      
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onCancel}
        className="h-5 w-5 rounded-full bg-purple-700 text-white flex items-center justify-center"
      >
        ✕
      </motion.button>
    </motion.div>
  );
}