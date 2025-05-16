import React, { memo, useState } from 'react';
import { useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMessage } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ImageViewerModal } from './ImageViewerModal';
import { Reply, CornerUpLeft } from 'lucide-react';

interface MessageProps {
  message: ChatMessage;
  showUser?: boolean;
  onReply?: (message: ChatMessage) => void;
}

function MessageComponent({ message, showUser = true, onReply }: MessageProps) {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const isCurrentUser = message.userId === currentUser?.id;
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState("");
  
  // Handle reply to message
  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };
  
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
      // Kiểm tra nếu media là định dạng JSON {"1": "path1", "2": "path2"}
      if (typeof message.media === 'object' && Object.keys(message.media).some(key => /^\d+$/.test(key))) {
        // Đây là định dạng mới - một object với các khóa số
        return (
          <div className="flex flex-wrap gap-1 mt-1 max-w-full">
            {Object.entries(message.media).map(([key, path]) => {
              // Đảm bảo đường dẫn là đầy đủ
              let imagePath = path as string;
              if (!imagePath.startsWith('http') && !imagePath.startsWith('/')) {
                imagePath = '/' + imagePath;
              }
              
              // Kiểm tra loại file dựa trên phần mở rộng
              const isImage = imagePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
              const isVideo = imagePath.match(/\.(mp4|webm|mov|avi|mkv)$/i);
              
              if (isImage) {
                return (
                  <div key={key} className="overflow-hidden rounded-lg cursor-pointer">
                    <img 
                      src={imagePath} 
                      alt={`Image ${key}`} 
                      className="object-cover h-auto max-h-32 max-w-32"
                      onClick={() => {
                        setViewingImageUrl(imagePath);
                        setImageViewerOpen(true);
                      }}
                      onError={(e) => {
                        console.error("Image failed to load:", imagePath, e);
                        e.currentTarget.src = ""; 
                        e.currentTarget.alt = "Image load failed";
                      }}
                    />
                  </div>
                );
              } else if (isVideo) {
                return (
                  <div key={key} className="overflow-hidden rounded-lg">
                    <video 
                      src={imagePath} 
                      controls 
                      className="max-w-[200px] max-h-32"
                    />
                  </div>
                );
              } else {
                // Nếu không phải ảnh hoặc video, hiển thị link để tải xuống
                return (
                  <div key={key} className="py-1.5 px-2.5 bg-gray-100 dark:bg-gray-700 rounded-md text-xs flex items-center">
                    <span className="font-medium mr-1.5">Tệp đính kèm:</span>
                    <a 
                      href={imagePath} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline"
                    >
                      {imagePath.split('/').pop()}
                    </a>
                  </div>
                );
              }
            })}
          </div>
        );
      }
      
      // Định dạng cũ - một object với url, type, v.v.
      if (message.media.url) {
        return (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.media.type?.startsWith('image/') ? (
              <div className="overflow-hidden rounded-lg cursor-pointer">
                <img 
                  src={message.media.url} 
                  alt={message.media.name || "Image attachment"} 
                  className="object-cover h-auto max-h-32 max-w-32"
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
              </div>
            ) : message.media.type?.startsWith('video/') ? (
              <div className="overflow-hidden rounded-lg">
                <video 
                  src={message.media.url} 
                  controls 
                  className="max-w-[200px] max-h-32"
                />
              </div>
            ) : (
              <div className="py-1.5 px-2.5 bg-gray-100 dark:bg-gray-700 rounded-md text-xs flex items-center">
                <span className="font-medium mr-1.5">Tệp đính kèm:</span>
                <a 
                  href={message.media.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  {message.media.name || "File"} 
                  {message.media.size && <span className="ml-1">({Math.round(message.media.size/1024)} KB)</span>}
                </a>
              </div>
            )}
          </div>
        );
      }
      
      // Nếu định dạng không được nhận dạng
      console.error("Unknown media format:", message.media);
      return (
        <div className="py-1.5 px-2.5 mt-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">
          Media attachment (unknown format)
        </div>
      );
    } catch (err) {
      console.error("Error rendering media:", err, message.media);
      return (
        <div className="text-xs text-destructive mt-1 py-1.5 px-2.5 bg-red-50 dark:bg-red-900/30 rounded-md">
          Error displaying media attachment
        </div>
      );
    }
  };
  
  if (isCurrentUser) {
    return (
      <>
        <div className="flex justify-end mb-2 group relative">
          <div className="max-w-[75%] pr-2">
            {showUser && (
              <div className="flex items-center justify-end gap-1 mb-0.5">
                <span className="text-xs text-muted-foreground/80">
                  {formatTime(new Date(message.createdAt))}
                </span>
                <span className="font-medium text-xs">Tôi</span>
              </div>
            )}
            
            {/* Tin nhắn văn bản */}
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white p-2 px-3 rounded-2xl rounded-tr-sm break-words relative group">
                <p className="text-sm leading-relaxed">{parseMessageContent(message.content)}</p>
                
                {/* Reply button (visible on hover) */}
                <button 
                  onClick={handleReply}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 p-1 rounded-full hover:bg-black/20"
                  title="Trả lời tin nhắn này"
                >
                  <CornerUpLeft className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Media Content (hoàn toàn tách biệt) */}
            {message.media && (
              <div className="flex justify-end mt-1">
                {renderMedia()}
              </div>
            )}
          </div>
          
          <Avatar className="h-7 w-7 flex-shrink-0 self-start">
            {currentUser?.avatar ? (
              <AvatarImage src={currentUser.avatar} alt={currentUser.username} />
            ) : (
              <AvatarFallback className="bg-blue-500 text-white text-xs">
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
      <div className="flex mb-2 group relative">
        <Avatar className="h-7 w-7 flex-shrink-0 self-start">
          {message.user?.avatar ? (
            <AvatarImage src={message.user.avatar} alt={message.user.username} />
          ) : (
            <AvatarFallback className="bg-gray-500 text-white text-xs">
              {message.user?.username.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="max-w-[75%] pl-2">
          {showUser && (
            <div className="flex items-center gap-1 mb-0.5">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (message.user?.id) {
                    navigate(`/user/${message.user.id}`);
                  }
                }}
                className="font-medium text-xs text-gray-800 dark:text-gray-200 hover:underline focus:outline-none"
              >
                {message.user?.username || 'Unknown'}
              </button>
              <span className="text-xs text-muted-foreground/80">
                {formatTime(new Date(message.createdAt))}
              </span>
            </div>
          )}
          
          {/* Tin nhắn văn bản */}
          <div className="flex">
            <div className="bg-gray-200 dark:bg-gray-800 p-2 px-3 rounded-2xl rounded-tl-sm dark:text-gray-100 relative group">
              <p className="text-sm leading-relaxed">{parseMessageContent(message.content)}</p>
              
              {/* Reply button (visible on hover) */}
              <button 
                onClick={handleReply}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-300/50 dark:bg-gray-700/50 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700"
                title="Trả lời tin nhắn này"
              >
                <CornerUpLeft className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          </div>
          
          {/* Media Content (hoàn toàn tách biệt) */}
          {message.media && (
            <div className="flex mt-1">
              {renderMedia()}
            </div>
          )}
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
