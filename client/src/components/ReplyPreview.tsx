import React, { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from 'lucide-react';
import { ChatMessage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface ReplyPreviewProps {
  message: ChatMessage;
  onCancel: () => void;
}

export function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  // Reference để có thể scroll tới element này khi cần
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Lấy nội dung trích dẫn từ tin nhắn gốc, tối đa 40 ký tự
  const quoteContent = message.content.length > 40
    ? message.content.substring(0, 40) + '...'
    : message.content;

  // Hiệu ứng khi component được mounted
  useEffect(() => {
    // Flash animation cho element khi xuất hiện
    if (previewRef.current) {
      previewRef.current.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
        }
      }, 500);
    }
  }, []);

  return (
    <AnimatePresence>
      <motion.div 
        ref={previewRef}
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 mb-2 transition-colors duration-500"
      >
        <div className="flex-1 flex items-center gap-2">
          {/* Avatar của người gửi tin nhắn gốc */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <Avatar className="h-6 w-6">
              {message.user?.avatar ? (
                <AvatarImage src={message.user.avatar} alt={message.user?.username || 'User'} />
              ) : (
                <AvatarFallback className="text-xs bg-blue-500 text-white">
                  {message.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
          </motion.div>
          
          <div className="flex flex-col">
            <motion.span 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-corner-up-left">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
              Đang trả lời {message.user?.username}
            </motion.span>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="text-xs text-gray-600 dark:text-gray-300 font-light italic"
            >
              {quoteContent}
            </motion.span>
          </div>
        </div>
        
        <motion.button 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.4 }}
          onClick={onCancel}
          className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Hủy trả lời"
        >
          <X className="h-3 w-3" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}