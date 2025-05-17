import React from 'react';
import { motion } from 'framer-motion';
import { MessageInput } from "@/components/ui/message-input";
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';
import { cn } from "@/lib/utils";

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
  placeholder = "Gửi tin nhắn...",
  replyPreview,
  colorPicker,
  typingIndicator,
  className
}: MinecraftChatboxProps) {
  const [message, setMessage] = React.useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {typingIndicator}
      
      {replyPreview}
      
      <motion.div 
        className="minecraft-boxchat p-2 rounded-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full px-4 py-2 text-base gaming-font text-white bg-black/80 border-2 border-gray-600 rounded-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] resize-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {colorPicker}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={disabled || !message.trim()}
              className="minecraft-button flex items-center justify-center p-2 h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}