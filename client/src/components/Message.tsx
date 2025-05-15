import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface MessageProps {
  message: ChatMessage;
  showUser?: boolean;
}

function MessageComponent({ message, showUser = true }: MessageProps) {
  const { user: currentUser } = useAuth();
  const isCurrentUser = message.userId === currentUser?.id;
  
  // Format time
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Parse message content to highlight mentions
  const parseMessageContent = (content: string): JSX.Element => {
    const parts = content.split(/(@\w+)/g);
    
    return (
      <>
        {parts.map((part, index) => {
          if (part.match(/@\w+/)) {
            return <span key={index} className="text-primary font-medium">{part}</span>;
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };
  
  // Render media if present
  const renderMedia = () => {
    if (!message.media) return null;
    
    // This is a simplified version - in a real app, you'd have different display for different media types
    return (
      <div className="mt-2">
        {message.media.type?.startsWith('image/') ? (
          <img 
            src={message.media.url} 
            alt="Message attachment" 
            className="max-w-full rounded-md max-h-60 object-contain"
          />
        ) : message.media.type?.startsWith('video/') ? (
          <video 
            src={message.media.url} 
            controls 
            className="max-w-full rounded-md max-h-60"
          />
        ) : (
          <div className="text-xs text-muted-foreground">
            Attached file: {message.media.name}
          </div>
        )}
      </div>
    );
  };
  
  if (isCurrentUser) {
    return (
      <div className="flex items-start justify-end space-x-2 mb-4">
        <div className="flex flex-col items-end">
          {showUser && (
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs text-muted-foreground">
                {formatTime(new Date(message.createdAt))}
              </span>
              <span className="font-medium text-sm">Tôi</span>
            </div>
          )}
          <div className="bg-primary text-primary-foreground p-2 rounded-lg max-w-xs sm:max-w-md break-words">
            <p className="text-sm">{parseMessageContent(message.content)}</p>
            {renderMedia()}
          </div>
        </div>
        <Avatar className="h-8 w-8">
          {currentUser?.avatar ? (
            <AvatarImage src={currentUser.avatar} alt={currentUser.username} />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentUser?.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      </div>
    );
  }
  
  return (
    <div className="flex items-start space-x-2 mb-4 max-w-[85%]">
      <Avatar className="h-8 w-8">
        {message.user?.avatar ? (
          <AvatarImage src={message.user.avatar} alt={message.user.username} />
        ) : (
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {message.user?.username.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        )}
      </Avatar>
      <div>
        {showUser && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm text-primary">
              {message.user?.username || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(new Date(message.createdAt))}
            </span>
          </div>
        )}
        <div className="bg-muted p-2 rounded-lg">
          <p className="text-sm">{parseMessageContent(message.content)}</p>
          {renderMedia()}
        </div>
      </div>
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const Message = memo(MessageComponent);
