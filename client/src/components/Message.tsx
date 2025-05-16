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
}

function MessageComponent({ message, showUser = true, onReply }: MessageProps) {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const isCurrentUser = message.userId === currentUser?.id;
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState("");
  const [isHovered, setIsHovered] = useState(false);

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

  // Parse message content to highlight mentions - FIX MENTION HIGHLIGHTING
  const parseMessageContent = (content: string): JSX.Element => {
    // Thay đổi regex để nhận dạng mention đầy đủ
    // Tìm các chuỗi bắt đầu bằng @ và theo sau là các chữ cái, số, dấu gạch dưới, dấu cách
    const mentionRegex = /@(\w+)/g;
    const parts = [];

    let lastIndex = 0;
    let match;

    // Tìm tất cả các mention trong nội dung tin nhắn
    while ((match = mentionRegex.exec(content)) !== null) {
      // Phần văn bản trước mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>,
        );
      }

      // Phần mention (@username)
      const mentionText = match[0]; // Lấy toàn bộ chuỗi @username
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md"
        >
          {mentionText}
        </span>,
      );

      // Cập nhật vị trí cuối cùng đã xử lý
      lastIndex = match.index + mentionText.length;
    }

    // Thêm phần văn bản còn lại sau mention cuối cùng (nếu có)
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>,
      );
    }

    // Trả về các phần đã được phân tích
    return <>{parts}</>;
  };

  // Render media completely isolated from text content
  const renderMedia = () => {
    if (!message.media) return null;

    try {
      // Kiểm tra nếu media là định dạng JSON {"1": "path1", "2": "path2"}
      if (
        typeof message.media === "object" &&
        Object.keys(message.media).some((key) => /^\d+$/.test(key))
      ) {
        // Container style for multiple images
        const mediaCount = Object.keys(message.media).length;
        const gridCols = mediaCount > 1 ? "grid-cols-2" : "";

        return (
          <div
            className={`mt-2 ${mediaCount > 1 ? "grid gap-2 " + gridCols : "block"} w-full max-w-[240px] isolate`}
            data-message-id={`media-container-${message.id}`}
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
                    className="overflow-hidden rounded-lg cursor-pointer isolate bg-gray-100 dark:bg-gray-800"
                    style={{ isolation: "isolate" }} // Double ensure isolation
                  >
                    <div
                      className="relative w-full h-full"
                      style={{ zIndex: 1 }}
                    >
                      <img
                        src={imagePath}
                        alt={`Image ${key}`}
                        className="object-cover w-full max-h-[240px]"
                        loading="lazy"
                        onClick={() => {
                          setViewingImageUrl(imagePath);
                          setImageViewerOpen(true);
                        }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = "";
                          target.alt = "Image load failed";
                          target.style.height = "24px";
                          target.style.opacity = "0.5";
                        }}
                      />
                    </div>
                  </div>
                );
              } else if (isVideo) {
                return (
                  <div
                    key={`media-${message.id}-${key}`}
                    className="overflow-hidden rounded-lg isolate bg-gray-100 dark:bg-gray-800"
                    style={{ isolation: "isolate" }}
                  >
                    <div
                      className="relative w-full h-full"
                      style={{ zIndex: 1 }}
                    >
                      <video
                        src={imagePath}
                        controls
                        className="max-w-full max-h-[240px]"
                        preload="metadata"
                      />
                    </div>
                  </div>
                );
              } else {
                // File đính kèm
                return (
                  <div
                    key={`file-${message.id}-${key}`}
                    className="py-1.5 px-2.5 bg-gray-100 dark:bg-gray-700 rounded-md text-xs flex items-center my-1 isolate"
                    style={{ isolation: "isolate" }}
                  >
                    <span className="font-medium mr-1.5">Tệp đính kèm:</span>
                    <a
                      href={imagePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline"
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
          <div
            className="mt-2 w-full max-w-[240px] isolate"
            style={{ isolation: "isolate" }}
          >
            {message.media.type?.startsWith("image/") ? (
              <div className="overflow-hidden rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-800">
                <img
                  src={message.media.url}
                  alt={message.media.name || "Image attachment"}
                  className="object-cover w-full max-h-[240px]"
                  loading="lazy"
                  onClick={() => {
                    setViewingImageUrl(String(message?.media?.url));
                    setImageViewerOpen(true);
                  }}
                />
              </div>
            ) : message.media.type?.startsWith("video/") ? (
              <div className="overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                <video
                  src={message.media.url}
                  controls
                  className="max-w-full max-h-[240px]"
                  preload="metadata"
                />
              </div>
            ) : (
              <div className="py-1.5 px-2.5 bg-gray-100 dark:bg-gray-700 rounded-md text-xs flex items-center my-1">
                <span className="font-medium mr-1.5">Tệp đính kèm:</span>
                <a
                  href={message.media.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  {message.media.name || "File"}
                  {message.media.size && (
                    <span className="ml-1">
                      ({Math.round(Number(message.media.size) / 1024)} KB)
                    </span>
                  )}
                </a>
              </div>
            )}
          </div>
        );
      }

      return null;
    } catch (err) {
      console.error("Error rendering media:", err, message.media);
      return (
        <div className="text-xs text-red-500 dark:text-red-400 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
          Không thể hiển thị file đính kèm
        </div>
      );
    }
  };

  // ===== COMPONENT LAYOUT WITH FULL ISOLATION =====
  return (
    <div
      className={cn("w-full py-1 clear-both", "my-0.5 relative isolate")}
      style={{ isolation: "isolate" }}
      data-message-id={message.id}
    >
      <div
        className={cn(
          "flex items-center gap-2 relative mx-3",
          isCurrentUser ? "flex-row-reverse" : "flex-row",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar */}
        <div
          className={cn(
            "w-7 h-7 flex-shrink-0 self-center",
            isCurrentUser ? "ml-2" : "mr-2",
          )}
        >
          <Avatar className="w-full h-full">
            {(isCurrentUser ? currentUser?.avatar : message.user?.avatar) ? (
              <AvatarImage
                src={isCurrentUser ? currentUser?.avatar : message.user?.avatar}
                alt={
                  isCurrentUser
                    ? currentUser?.username
                    : message.user?.username || "User"
                }
              />
            ) : (
              <AvatarFallback
                className={cn(
                  "text-xs bg-opacity-90",
                  isCurrentUser
                    ? "bg-blue-500 text-white"
                    : "bg-gray-500 text-white",
                )}
              >
                {isCurrentUser
                  ? currentUser?.username.substring(0, 2).toUpperCase()
                  : message.user?.username?.substring(0, 2).toUpperCase() ||
                    "U"}
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        {/* Message Body */}
        <div
          className={cn(
            "flex flex-col relative", // Add relative here
            "max-w-[75%] md:max-w-[70%]",
            isCurrentUser ? "items-end" : "items-start",
          )}
        >
          {/* Username & Time */}
          {showUser && (
            <div
              className={cn(
                "flex items-center text-xs mb-1",
                isCurrentUser ? "flex-row-reverse" : "flex-row",
              )}
            >
              <span
                className={cn(
                  "font-medium text-gray-800 p-1 dark:text-gray-200",
                  isCurrentUser ? "mr-1" : "ml-1",
                )}
              >
                {isCurrentUser ? (
                  " Tôi "
                ) : (
                  <button
                    onClick={() => {
                      if (message.user?.id) {
                        navigate(`/user/${message.user.id}`);
                      }
                    }}
                    className="hover:underline"
                  >
                    {message.user?.username || " Unknown "}
                  </button>
                )}
              </span>
              <span className="text-gray-500 p-1 dark:text-gray-400">
                {"["}
                {formatTime(new Date(message.createdAt))}
                {"]"}
              </span>
            </div>
          )}

          <div className="relative flex items-center">
            {isCurrentUser && (
              <button
                onClick={handleReply}
                className="mr-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm opacity-70 hover:opacity-100 transition-opacity duration-150"
                title="Trả lời tin nhắn này"
              >
                <CornerUpLeft className="h-3 w-3 text-gray-600 dark:text-gray-300" />
              </button>
            )}

            {/* Text Bubble - TEXT ONLY */}
            {message.content && (
              <div
                className={cn(
                  "p-2 px-3 rounded-2xl mb-1 break-words max-w-full",
                  isCurrentUser
                    ? "bg-blue-500 text-white rounded-tr-sm"
                    : "bg-gray-200 dark:bg-gray-700 dark:text-white rounded-tl-sm",
                )}
              >
                <p className="text-sm leading-relaxed break-words whitespace-pre-line">
                  {parseMessageContent(message.content)}
                </p>
              </div>
            )}

            {/* Reply button - right side for other users' messages */}
            {!isCurrentUser && (
              <button
                onClick={handleReply}
                className="ml-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm opacity-70 hover:opacity-100 transition-opacity duration-150"
                title="Trả lời tin nhắn này"
              >
                <CornerUpLeft className="h-3 w-3 text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>

          {/* Media Content - COMPLETELY SEPARATE */}
          <div
            className={cn("w-full", isCurrentUser ? "flex justify-end" : "")}
          >
            {renderMedia()}
          </div>
        </div>

        {/* Always visible Reply Button */}
        {/* <button
          onClick={handleReply}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm",
            isCurrentUser ? "-left-1" : "-right-1",
            "opacity-70 hover:opacity-100 transition-opacity duration-150",
          )}
          title="Trả lời tin nhắn này"
        >
          <CornerUpLeft className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
        </button> */}
      </div>

      {/* Image viewer modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewingImageUrl}
        title="Hình ảnh đính kèm"
      />
    </div>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const Message = memo(MessageComponent);
