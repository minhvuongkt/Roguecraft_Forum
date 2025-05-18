import React, { useState } from 'react';
import { MinecraftChatbox } from './MinecraftChatbox';
import { MinecraftMessage } from './MinecraftMessage';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { MessageColorPicker } from './MessageColorPicker';
import { MessengerReplyIndicator } from './MessengerReplyIndicator';
import { TypingIndicator } from './TypingIndicator';

interface MinecraftChatContainerProps {
  messages: ChatMessage[];
  onSend: (message: string, media?: any) => void;
  userTyping?: string | null;
  className?: string;
}

export function MinecraftChatContainer({
  messages,
  onSend,
  userTyping,
  className
}: MinecraftChatContainerProps) {
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  const handleSendMessage = (content: string, media?: any) => {
    onSend(content, media);
    setReplyingTo(null);
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo(message);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages Container */}
      <div 
        className="flex-grow overflow-y-auto p-2 mb-2 minecraft-panel minecraft-scrollbar" 
        style={{ 
          backgroundColor: "transparent",
          border: "2px solid",
          borderLeftColor: "#6b6b6b",
          borderTopColor: "#6b6b6b",
          borderRightColor: "#2d2d2d",
          borderBottomColor: "#2d2d2d",
          minHeight: "300px" 
        }}
      >
        {messages.map(message => (
          <MinecraftMessage
            key={message.id}
            message={message}
            onReply={handleReply}
          />
        ))}
        
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="minecraft-font text-gray-400">Chưa có tin nhắn nào.</p>
          </div>
        )}
      </div>
      
      {/* Chat Input */}
      <div className="mt-1">
        <MinecraftChatbox
          onSend={handleSendMessage}
          placeholder="Nhập tin nhắn..."
          replyPreview={
            replyingTo ? (
              <MessengerReplyIndicator
                message={replyingTo}
                onCancel={() => setReplyingTo(null)}
                className="minecraft-reply-reference p-2"
              />
            ) : undefined
          }
          colorPicker={<MessageColorPicker onColorSelect={function (color: string): void {
              throw new Error('Function not implemented.');
          } } />}
          typingIndicator={
            userTyping ? (
              <TypingIndicator username={userTyping} />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
