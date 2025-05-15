import React, { memo, useState } from 'react';
import { useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ImageViewerModal } from './ImageViewerModal';

interface MessageProps {
  message: ChatMessage;
  showUser?: boolean;
}

function MessageComponent({ message, showUser = true }: MessageProps) {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const isCurrentUser = message.userId === currentUser?.id;
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState("");
  
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
            return (
              <span 
                key={index} 
                className="text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md"
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };
  
  // Render media if present
  const renderMedia = () => {
    if (!message.media) return null;
    
    console.log("Rendering media:", message.media);
    
    try {
      return (
        <div className="mt-2">
          {message.media.type?.startsWith('image/') ? (
            <img 
              src={message.media.url} 
              alt={message.media.name || "Image attachment"} 
              className="max-w-full rounded-md max-h-60 object-contain cursor-pointer"
              onClick={() => {
                setViewingImageUrl(message.media.url);
                setImageViewerOpen(true);
              }}
              onError={(e) => {
                console.error("Image failed to load:", e);
                e.currentTarget.src = ""; // Clear the broken URL
                e.currentTarget.alt = "Image load failed";
              }}
            />
          ) : message.media.type?.startsWith('video/') ? (
            <video 
              src={message.media.url} 
              controls 
              className="max-w-full rounded-md max-h-60"
            />
          ) : (
            <div className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
              <span className="font-medium">Attached file:</span> {message.media.name} 
              {message.media.size && <span className="ml-1">({Math.round(message.media.size/1024)} KB)</span>}
            </div>
          )}
        </div>
      );
    } catch (err) {
      console.error("Error rendering media:", err);
      return (
        <div className="text-xs text-destructive mt-2">
          Error displaying media attachment
        </div>
      );
    }
  };
  
  if (isCurrentUser) {
    return (
      <>
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

        {/* Image viewer modal */}
        <ImageViewerModal
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          imageUrl={viewingImageUrl}
          title="Hình ảnh đính kèm"
        />
      </>
    );
  }
  
  return (
    <>
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
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (message.user?.id) {
                    navigate(`/user/${message.user.id}`);
                  }
                }}
                className="font-medium text-sm text-primary hover:underline focus:outline-none"
              >
                {message.user?.username || 'Unknown'}
              </button>
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

      {/* Image viewer modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewingImageUrl}
        title="Hình ảnh đính kèm"
      />
    </>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const Message = memo(MessageComponent);
