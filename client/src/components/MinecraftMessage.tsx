import React, { memo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { cn } from "@/lib/utils";
import { ImageViewerModal } from "./ImageViewerModal";
import { CornerUpLeft } from "lucide-react";
import { useTheme } from '@/hooks/use-theme';

interface MessageProps {
  message: ChatMessage;
  showUser?: boolean;
  onReply?: (message: ChatMessage) => void;
}

const MinecraftMessageComponent = ({
  message,
  showUser = true,
  onReply,
}: MessageProps) => {
  const { user: currentUser } = useAuth();
  const { findMessagesByUsername, findMessageById } = useWebSocket();
  const [, navigate] = useLocation();
  const isCurrentUser = message.userId === currentUser?.id;
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const [highlightOriginal, setHighlightOriginal] = useState(false);
  const { theme } = useTheme();

  const isReplyMessage =
    message.replyToMessageId !== null &&
    message.replyToMessageId !== undefined &&
    Number(message.replyToMessageId) !== 0;

  // Always parse replyToMessageId as number for lookup
  const replyToId = isReplyMessage ? Number(message.replyToMessageId) : undefined;
  const originalMessage = isReplyMessage && replyToId && !isNaN(replyToId)
    ? findMessageById(replyToId)
    : undefined;

  useEffect(() => {
    if (highlightOriginal) {
      const timer = setTimeout(() => {
        setHighlightOriginal(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightOriginal]);

  const scrollToMessageById = (messageId: number) => {
    const targetElement = document.getElementById(`msg-${messageId}`);

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      targetElement.classList.add("bg-yellow-100", "dark:bg-yellow-900/30");
      targetElement.classList.add("scale-[1.02]");
      targetElement.classList.add("shadow-md", "z-10", "relative");
      targetElement.style.transition = "all 0.3s ease";

      let pulseCount = 0;
      const maxPulses = 3;
      const pulseInterval = setInterval(() => {
        if (pulseCount >= maxPulses) {
          clearInterval(pulseInterval);
          targetElement.style.transition = "all 0.5s ease-out";

          setTimeout(() => {
            targetElement.classList.remove(
              "bg-yellow-100",
              "dark:bg-yellow-900/30",
              "scale-[1.02]",
              "shadow-md",
              "z-10",
              "relative",
            );
          }, 500);

          return;
        }

        targetElement.classList.toggle("bg-yellow-200");
        targetElement.classList.toggle("bg-yellow-100");
        pulseCount++;
      }, 400);
    } else {
      console.log("Message not found or not in view:", messageId);
    }
  };

  const handleReply = () => {
    if (onReply && message) {
      const messageId = Number(message.id);
      const messageToReply = {
        ...message,
        id: messageId
      };
      onReply(messageToReply);
    }
  };
  // Format time with timezone
  const formatTime = (date: string | Date): string => {
    const d = new Date(date);
    // Adjust to Vietnam timezone (UTC+7)
    d.setHours(d.getHours() + 7);
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  const parseMessageContent = (content: string): JSX.Element => {
    const mentionRegex = /@(\S+)/g;
    const parts = [];

    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>,
        );
      }

      const mentionText = match[0];
      const username = mentionText.substring(1);

      parts.push(
        <span
          key={`mention-${match.index}`}
          className="text-yellow-300 font-medium px-1 py-0.5 cursor-pointer hover:underline"
          title={`Nhấn để xem tin nhắn của ${username}`}
          onClick={() => {
            const userMessages = findMessagesByUsername(username);

            if (userMessages.length > 0) {
              const sortedMessages = [...userMessages].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              );

              scrollToMessageById(sortedMessages[0].id);
            }
          }}
        >
          {mentionText}
        </span>,
      );

      lastIndex = match.index + mentionText.length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>,
      );
    }

    return <>{parts}</>;
  };
  const renderMedia = () => {
    if (!message.media) return null;

    try {
      let mediaObj: any = message.media;
      if (typeof mediaObj === "string") {
        try {
          mediaObj = JSON.parse(mediaObj);
        } catch {
          mediaObj = { 0: mediaObj };
        }
      }
      if (
        typeof mediaObj === "object" &&
        (Object.keys(mediaObj).some((key) => /^\d+$/.test(key)) ||
          Object.keys(mediaObj).some((key) => key === "image"))
      ) {
        const mediaCount = Object.keys(mediaObj).length;
        const gridCols = mediaCount > 1 ? "grid-cols-2" : "";

        return (
          <div
            className={`mt-2 ${mediaCount > 1 ? "grid gap-2 " + gridCols : "block"} w-full max-w-[240px] isolate`}
            data-message-id={`media-container-${message.id}`}
          >
            {Object.entries(mediaObj).map(([key, path]) => {
              let imagePath = path as string;
              if (imagePath.startsWith("public/")) {
                imagePath = imagePath.replace(/^public/, "");
              }
              if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
                imagePath = "/" + imagePath;
              }
              const isImage = imagePath.match(
                /\.(jpg|jpeg|png|gif|webp|svg)$/i,
              );
              if (isImage) {
                return (
                  <div
                    key={`media-${message.id}-${key}`}
                    className="minecraft-panel p-1 cursor-pointer"
                  >
                    <img
                      src={imagePath}
                      alt={`Image ${key}`}
                      className="minecraft-pixelated-image w-full max-h-[240px]"
                      loading="lazy"
                      onClick={() => {
                        setViewingImageUrl(imagePath);
                        setImageViewerOpen(true);
                      }}
                      onError={(e) => {
                        console.error("Failed to load image:", imagePath);
                        const target = e.currentTarget;
                        target.src = "";
                        target.alt = "Image load failed";
                        target.style.height = "24px";
                        target.style.opacity = "0.5";
                      }}
                    />
                  </div>
                );
              } else {
                return (
                  <div
                    key={`file-${message.id}-${key}`}
                    className="minecraft-message-box text-xs my-1"
                  >
                    <span className="minecraft-font text-yellow-300">Tệp đính kèm:</span>
                    <a
                      href={imagePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="minecraft-font text-blue-400 underline ml-1"
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

      return null;
    } catch (err) {
      console.error("Error rendering media:", err, message.media);
      return (
        <div className="minecraft-font text-red-500 mt-2 p-2 bg-black border border-red-500 rounded-md">
          Không thể hiển thị file đính kèm
        </div>
      );
    }
  };

  // Style cho light/dark mode
//   const messageBoxStyle = theme === 'dark'
//     ? { backgroundColor: '#181818', border: '2px solid #555', color: '#fff' }
//     : { backgroundColor: '#f3f3f3', border: '2px solid #bbb', color: '#222' };
  const replyRefStyle = theme === 'dark'
    ? {
        backgroundColor: '#232323',
        border: '2px solid #aaff77',
        color: '#aaff77',
        boxShadow: '0 0 0 2px #232323, 0 0 0 4px #333',
        padding: '6px 10px',
        borderRadius: '6px',
        fontFamily: 'Minecraftia, monospace',
        fontSize: '13px',
        marginBottom: '8px',
        marginTop: '2px',
        outline: '2px solid #333',
        outlineOffset: '-2px',
        filter: 'drop-shadow(0 2px 0 #111)',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }
    : {
        backgroundColor: '#eaeaea',
        border: '2px solid #228800',
        color: '#228800',
        boxShadow: '0 0 0 2px #eaeaea, 0 0 0 4px #bbb',
        padding: '6px 10px',
        borderRadius: '6px',
        fontFamily: 'Minecraftia, monospace',
        fontSize: '13px',
        marginBottom: '8px',
        marginTop: '2px',
        outline: '2px solid #bbb',
        outlineOffset: '-2px',
        filter: 'drop-shadow(0 2px 0 #ccc)',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      };
  const replyBtnClass = theme === 'dark'
    ? 'minecraft-styled-button text-white border-[#aaff77] hover:bg-[#333] shadow-[0_2px_0_#111]'
    : 'minecraft-styled-button text-[#228800] border-[#228800] hover:bg-[#b6ffb6] shadow-[0_2px_0_#bbb] focus:ring-2 focus:ring-[#228800]';

  return (
    <div
      className={cn(
        'w-full py-1 clear-both',
        'my-1 relative',
        highlightOriginal &&
          (theme === 'dark'
            ? 'bg-yellow-900/20'
            : 'bg-yellow-100/60') + ' transition-all duration-300 ease-in-out',
      )}
      data-message-id={typeof message.id === 'string' ? parseInt(message.id) : message.id}
      id={`msg-${message.id}`}
    >
      <div
        className={cn(
          'flex items-start gap-2 relative mx-3',
          isCurrentUser ? 'flex-row-reverse' : 'flex-row',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        ref={messageRef}
      >
        {showUser && (
          <div
            className={cn(
              'w-7 h-7 flex-shrink-0 cursor-pointer',
              isCurrentUser ? 'ml-2' : 'mr-2',
            )}
            onClick={() => {
              if ((isCurrentUser ? currentUser?.id : message.user?.id)) {
                navigate(`/profile/${isCurrentUser ? currentUser?.id : message.user?.id}`);
              }
            }}
            title={`Mở hồ sơ của ${isCurrentUser ? currentUser?.username : message.user?.username || 'User'}`}
          >
            <Avatar className={cn('w-full h-full minecraft-panel', theme === 'dark' ? 'bg-[#232323]' : 'bg-[#eaeaea]')}>
              {(isCurrentUser ? currentUser?.avatar : message.user?.avatar) ? (
                <AvatarImage
                  src={
                    (isCurrentUser ? currentUser?.avatar : message.user?.avatar) ?? undefined
                  }
                  alt={
                    isCurrentUser
                      ? currentUser?.username
                      : message.user?.username || 'User'
                  }
                  className="pixelated"
                />
              ) : (
                <AvatarFallback
                  className={cn('minecraft-font', theme === 'dark' ? 'text-white bg-[#232323]' : 'text-black bg-[#eaeaea]')}
                >
                  {isCurrentUser
                    ? currentUser?.username?.substring(0, 2).toUpperCase()
                    : message.user?.username?.substring(0, 2).toUpperCase() ||
                      'U'}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
        )}

        <div
          className={cn(
            'flex flex-col',
            'max-w-[75%] md:max-w-[70%]',
            isCurrentUser ? 'items-end' : 'items-start',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {showUser && !isCurrentUser && (
              <span 
                className={cn(
                  'minecraft-message-username cursor-pointer hover:underline', 
                  theme === 'dark' ? 'text-[#aaff77]' : 'text-[#116600] font-bold'
                )}
                onClick={() => {
                  if (message.user?.id) {
                    navigate(`/profile/${message.user.id}`);
                  }
                }}
                title={`Mở hồ sơ của ${message.user?.username || 'Unknown'}`}
              >
                {message.user?.username || 'Unknown'}
              </span>
            )}
            <span className={cn('minecraft-font text-xs', theme === 'dark' ? 'text-gray-400' : 'text-gray-700')}>
              [{formatTime(new Date(message.createdAt))}]
            </span>
          </div>
          {/* Khung xem tin nhắn gốc tách biệt phía trên nội dung trả lời */}
          {isReplyMessage && originalMessage && (
            <div
              className={cn(
                'minecraft-panel border-2 mb-2 px-3 py-2 flex flex-col',
                theme === 'dark'
                  ? 'border-[#aaff77] text-[#aaff77]'
                  : 'border-[#116600] text-[#116600]'
              )}
              style={{ 
                fontSize: '1em', 
                fontFamily: "'VT323', monospace",
                background: 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: theme === 'dark' ? '0 1px 3px rgba(170, 255, 119, 0.2)' : '0 1px 3px rgba(17, 102, 0, 0.2)'
              }}
              onClick={() => replyToId && scrollToMessageById(replyToId)}
              title="Nhấn để xem tin nhắn gốc"
              tabIndex={0}
              role="button"
            >
              <div className="flex items-center gap-1">
                <span className="font-bold text-lg">↩</span>
                <span className="font-bold">
                  {originalMessage.user?.username || 'User'}:
                </span>
                <span className="truncate" style={{ opacity: 0.95 }}>
                  {originalMessage.content && originalMessage.content.length > 40
                    ? originalMessage.content.substring(0, 40) + '...'
                    : originalMessage.content || ''}
                </span>
              </div>
            </div>
          )}
          <div className="relative">
            {message.content && (
              <div
                className={cn(
                  'minecraft-message-box border-2 rounded',
                  isCurrentUser ? (localStorage.getItem('userMessageColor') || '') : '',
                  isReplyMessage ? '' : '',
                  theme === 'dark' ? 'border-[#555]' : 'border-[#444] shadow-sm'
                )}
                style={{ 
                  background: 'none', 
                  backgroundColor: 'transparent'
                }}
              >
                <div className={cn(
                  'minecraft-font', 
                  theme === 'dark' ? 'text-white' : 'text-[#000000]'
                )}
                style={{
                  fontWeight: theme === 'dark' ? 'normal' : '500',
                  textShadow: theme === 'dark' ? '0px 1px 2px rgba(0, 0, 0, 0.5)' : 'none'
                }}
                >
                  {parseMessageContent(message.content)}
                </div>
              </div>
            )}
            {renderMedia()}
            <button
              onClick={handleReply}
              className={cn(
                replyBtnClass, 
                'p-1.5 opacity-100 hover:opacity-90 mt-1 border-2 rounded-md transition-all duration-150',
                'flex items-center gap-1.5',
                theme === 'dark' 
                  ? 'bg-transparent border-[#aaff77] hover:bg-[#333]' 
                  : 'bg-transparent border-[#116600] hover:bg-[#eaffea]'
              )}
              title="Trả lời tin nhắn này"
              style={{
                fontFamily: "'VT323', monospace",
                fontSize: '0.95rem',
                padding: '3px 8px',
                boxShadow: theme === 'dark' ? '0 2px 4px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.15)'
              }}
            >
              <CornerUpLeft className={theme === 'dark' ? 'h-4 w-4 text-[#aaff77]' : 'h-4 w-4 text-[#116600]'} />
              <span className={theme === 'dark' ? 'text-[#aaff77]' : 'text-[#116600] font-medium'}>Trả lời</span>
            </button>
          </div>
        </div>
      </div>
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewingImageUrl}
        title="Hình ảnh đính kèm"
      />
    </div>
  );
};

export const MinecraftMessage = memo(MinecraftMessageComponent);
