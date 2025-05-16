import React, { memo, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ImageViewerModal } from "./ImageViewerModal";
import { CornerUpLeft } from "lucide-react";

interface MessageProps {
  message: ChatMessage;
  showUser?: boolean;
  onReply?: (message: ChatMessage) => void;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isNewMessage?: boolean;
}

function MessageComponent({
  message,
  showUser = true,
  onReply,
  isFirstInGroup = true,
  isLastInGroup = true,
  isNewMessage = false,
}: MessageProps) {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const isCurrentUser = message.userId === currentUser?.id;
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  // Ref cho message để có thể focus vào tin nhắn mới
  const messageRef = useRef<HTMLDivElement>(null);

  // Focus vào tin nhắn mới
  React.useEffect(() => {
    if (isNewMessage && messageRef.current) {
      // Thêm animation highlight cho tin nhắn mới
      messageRef.current.classList.add("animate-highlight");

      // Xóa animation sau khi chạy xong
      const timer = setTimeout(() => {
        if (messageRef.current) {
          messageRef.current.classList.remove("animate-highlight");
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isNewMessage]);

  // Handle reply to message
  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  // Format time
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
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
      if (
        typeof message.media === "object" &&
        Object.keys(message.media).some((key) => /^\d+$/.test(key))
      ) {
        // Lấy số lượng media để xác định layout
        const mediaCount = Object.keys(message.media).length;
        const mediaLayout = mediaCount > 1 ? "grid grid-cols-2 gap-1" : "block";

        return (
          <div
            className={`mt-2 overflow-hidden ${mediaLayout} w-full`}
            data-media-container="true"
            data-count={mediaCount}
          >
            {Object.entries(message.media).map(([key, path]) => {
              // Đảm bảo đường dẫn là đầy đủ
              let imagePath = path as string;
              if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
                imagePath = "/" + imagePath;
              }

              // Kiểm tra loại file dựa trên phần mở rộng
              const isImage = imagePath.match(
                /\.(jpg|jpeg|png|gif|webp|svg)$/i,
              );
              const isVideo = imagePath.match(/\.(mp4|webm|mov|avi|mkv)$/i);

              if (isImage) {
                return (
                  <div
                    key={`media-${message.id}-${key}`}
                    className="overflow-hidden rounded-lg cursor-pointer mb-1"
                    data-media-type="image"
                  >
                    <img
                      src={imagePath}
                      alt={`Image ${key}`}
                      className={cn(
                        "object-cover w-full",
                        mediaCount > 1 ? "h-24" : "max-h-64",
                      )}
                      loading="lazy"
                      onClick={() => {
                        setViewingImageUrl(imagePath);
                        setImageViewerOpen(true);
                      }}
                      onError={(e) => {
                        console.error("Image failed to load:", imagePath, e);
                        const target = e.currentTarget;
                        target.src = "";
                        target.alt = "Image load failed";
                        target.style.height = "24px";
                        target.style.opacity = "0.5";
                      }}
                    />
                  </div>
                );
              } else if (isVideo) {
                return (
                  <div
                    key={`media-${message.id}-${key}`}
                    className="overflow-hidden rounded-lg mb-1"
                    data-media-type="video"
                  >
                    <video
                      src={imagePath}
                      controls
                      className={cn(
                        "max-w-full",
                        mediaCount > 1 ? "h-24" : "max-h-64",
                      )}
                      preload="metadata"
                    />
                  </div>
                );
              } else {
                // Nếu không phải ảnh hoặc video, hiển thị link để tải xuống
                return (
                  <div
                    key={`media-${message.id}-${key}`}
                    className="py-1.5 px-2.5 bg-gray-100 dark:bg-gray-700 rounded-md text-xs flex items-center mb-1"
                    data-media-type="file"
                  >
                    <span className="font-medium mr-1.5">Tệp đính kèm:</span>
                    <a
                      href={imagePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {imagePath.split("/").pop()}
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
          <div className="mt-2 overflow-hidden" data-media-container="legacy">
            {message.media.type?.startsWith("image/") ? (
              <div className="overflow-hidden rounded-lg cursor-pointer mb-1">
                <img
                  src={message.media.url}
                  alt={message.media.name || "Image attachment"}
                  className="object-cover max-w-full max-h-64"
                  loading="lazy"
                  onClick={() => {
                    setViewingImageUrl(message.media.url);
                    setImageViewerOpen(true);
                  }}
                  onError={(e) => {
                    console.error("Image failed to load:", e);
                    const target = e.currentTarget;
                    target.src = "";
                    target.alt = "Image load failed";
                    target.style.height = "24px";
                    target.style.opacity = "0.5";
                  }}
                />
              </div>
            ) : message.media.type?.startsWith("video/") ? (
              <div className="overflow-hidden rounded-lg mb-1">
                <video
                  src={message.media.url}
                  controls
                  className="max-w-full max-h-64"
                  preload="metadata"
                />
              </div>
            ) : (
              <div className="py-1.5 px-2.5 bg-gray-100 dark:bg-gray-700 rounded-md text-xs flex items-center mb-1">
                <span className="font-medium mr-1.5">Tệp đính kèm:</span>
                <a
                  href={message.media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {message.media.name || "File"}
                  {message.media.size && (
                    <span className="ml-1">
                      ({Math.round(message.media.size / 1024)} KB)
                    </span>
                  )}
                </a>
              </div>
            )}
          </div>
        );
      }

      // Nếu định dạng không được nhận dạng
      console.error("Unknown media format:", message.media);
      return null;
    } catch (err) {
      console.error("Error rendering media:", err, message.media);
      return null;
    }
  };

  if (isCurrentUser) {
    return (
      <>
        {/* Sử dụng key duy nhất để tránh việc tái sử dụng DOM giữa các tin nhắn */}
        <div
          className={cn(
            "flex justify-end mb-2 group relative",
            isNewMessage && "bg-blue-50/30 dark:bg-blue-900/10", // Highlight cho tin nhắn mới
          )}
          key={`message-${message.id}`}
          data-message-id={message.id}
          ref={messageRef}
        >
          <div className="max-w-[75%] md:max-w-[65%] pr-2">
            {showUser && (
              <div className="flex items-center justify-end gap-1 mb-0.5">
                <span className="text-xs text-muted-foreground/80">
                  {formatTime(new Date(message.createdAt))}
                </span>
                <span className="font-medium text-xs">Tôi</span>
              </div>
            )}

            {/* Phần nội dung tin nhắn */}
            <div className="flex flex-col items-end">
              {/* Tin nhắn văn bản - Luôn render nếu có nội dung */}
              {message.content && (
                <div
                  className="bg-gray-700 text-white p-2.5 px-4 rounded-2xl rounded-tr-sm break-words relative group mb-1"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {parseMessageContent(message.content)}
                  </p>

                  {/* Reply button (visible on hover) */}
                  {isHovered && (
                    <button
                      onClick={handleReply}
                      className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-full hover:bg-gray-100 shadow-sm"
                      title="Trả lời tin nhắn này"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5 text-gray-700" />
                    </button>
                  )}
                </div>
              )}

              {/* Media Content - Tách biệt với nội dung */}
              <div className="w-full">{renderMedia()}</div>
            </div>
          </div>

          <Avatar className="h-7 w-7 flex-shrink-0 self-start">
            {currentUser?.avatar ? (
              <AvatarImage
                src={currentUser.avatar}
                alt={currentUser.username}
              />
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
      <div
        className={cn(
          "flex mb-2 group relative",
          isNewMessage && "bg-blue-50/30 dark:bg-blue-900/10", // Highlight cho tin nhắn mới
        )}
        key={`message-${message.id}`}
        data-message-id={message.id}
        ref={messageRef}
      >
        <Avatar className="h-7 w-7 flex-shrink-0 self-start">
          {message.user?.avatar ? (
            <AvatarImage
              src={message.user.avatar}
              alt={message.user.username}
            />
          ) : (
            <AvatarFallback className="bg-gray-500 text-white text-xs">
              {message.user?.username.substring(0, 2).toUpperCase() || "U"}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="max-w-[75%] md:max-w-[65%] pl-2">
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
                {message.user?.username || "Unknown"}
              </button>
              <span className="text-xs text-muted-foreground/80">
                {formatTime(new Date(message.createdAt))}
              </span>
            </div>
          )}

          {/* Phần nội dung tin nhắn */}
          <div className="flex flex-col">
            {/* Tin nhắn văn bản - Luôn render nếu có nội dung */}
            {message.content && (
              <div
                className="bg-gray-200 dark:bg-gray-600 p-2.5 px-4 rounded-2xl rounded-tl-sm dark:text-white relative group mb-1"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <p className="text-sm leading-relaxed whitespace-pre-line">
                  {parseMessageContent(message.content)}
                </p>

                {/* Reply button (visible on hover) */}
                {isHovered && (
                  <button
                    onClick={handleReply}
                    className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm"
                    title="Trả lời tin nhắn này"
                  >
                    <CornerUpLeft className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
                  </button>
                )}
              </div>
            )}

            {/* Media Content - Tách biệt với nội dung */}
            <div className="w-full">{renderMedia()}</div>
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

// Thêm CSS animation cho tin nhắn mới
const styles = `
@keyframes highlightMessage {
  0% { background-color: rgba(59, 130, 246, 0.2); }
  70% { background-color: rgba(59, 130, 246, 0.1); }
  100% { background-color: transparent; }
}

.animate-highlight {
  animation: highlightMessage 2s ease-out forwards;
}
`;

// Thêm styles vào document nếu chưa có
if (typeof document !== "undefined") {
  if (!document.getElementById("message-highlight-styles")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "message-highlight-styles";
    styleSheet.innerHTML = styles;
    document.head.appendChild(styleSheet);
  }
}

// Export memoized component to prevent unnecessary re-renders
export const Message = memo(MessageComponent);
