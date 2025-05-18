import React, { memo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatMessage } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { cn } from "@/lib/utils";
import { ImageViewerModal } from "./ImageViewerModal";
import { CornerUpLeft } from "lucide-react";

interface MessageProps {
  message: ChatMessage;
  showUser?: boolean;
  onReply?: (message: ChatMessage) => void;
}

const MessageComponent = ({
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

  // Parse message content to highlight mentions
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
          className="text-blue-600 dark:text-blue-400 font-medium bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50"
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

  // --- FIXED renderMedia ---
  const renderMedia = () => {
    if (!message.media) return null;

    try {
      let mediaObj: any = message.media;
      // If media is a stringified object, parse it
      if (typeof mediaObj === "string") {
        try {
          mediaObj = JSON.parse(mediaObj);
        } catch {
          // fallback: treat as single path string
          mediaObj = { 0: mediaObj };
        }
      }

      // Format 1: Object with numeric keys or "image" key
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
              // Remove leading "public" if present
              if (imagePath.startsWith("public/")) {
                imagePath = imagePath.replace(/^public/, "");
              }
              // Ensure path starts with / or http
              if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
                imagePath = "/" + imagePath;
              }

              // Determine file type based on extension
              const isImage = imagePath.match(
                /\.(jpg|jpeg|png|gif|webp|svg)$/i,
              );
              const isVideo = imagePath.match(/\.(mp4|webm|mov|avi|mkv)$/i);

              if (isImage) {
                return (
                  <div
                    key={`media-${message.id}-${key}`}
                    className="overflow-hidden rounded-lg cursor-pointer isolate bg-gray-100 dark:bg-gray-800"
                    style={{ isolation: "isolate" }}
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
                          console.error("Failed to load image:", imagePath);
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

      // Format 2: Object with url property (legacy)
      if (mediaObj && typeof mediaObj === "object" && mediaObj.url) {
        let mediaUrl = mediaObj.url;
        if (mediaUrl.startsWith("public/")) {
          mediaUrl = mediaUrl.replace(/^public/, "");
        }
        if (!mediaUrl.startsWith("http") && !mediaUrl.startsWith("/")) {
          mediaUrl = "/" + mediaUrl;
        }

        return (
          <div
            className="mt-2 w-full max-w-[240px] isolate"
            style={{ isolation: "isolate" }}
          >
            {mediaObj.type?.startsWith("image/") ? (
              <div className="overflow-hidden rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-800">
                <img
                  src={mediaUrl}
                  alt={mediaObj.name || "Image attachment"}
                  className="object-cover w-full max-h-[240px]"
                  loading="lazy"
                  onClick={() => {
                    setViewingImageUrl(mediaUrl);
                    setImageViewerOpen(true);
                  }}
                  onError={(e) => {
                    console.error("Failed to load image:", mediaUrl);
                    const target = e.currentTarget;
                    target.src = "";
                    target.alt = "Image load failed";
                    target.style.height = "24px";
                    target.style.opacity = "0.5";
                  }}
                />
              </div>
            ) : mediaObj.type?.startsWith("video/") ? (
              <div className="overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                <video
                  src={mediaUrl}
                  controls
                  className="max-w-full max-h-[240px]"
                  preload="metadata"
                />
              </div>
            ) : (
              <div className="py-1.5 px-2.5 bg-gray-100 dark:bg-gray-700 rounded-md text-xs flex items-center my-1">
                <span className="font-medium mr-1.5">Tệp đính kèm:</span>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  {mediaObj.name || "File"}
                  {mediaObj.size && (
                    <span className="ml-1">
                      ({Math.round(Number(mediaObj.size) / 1024)} KB)
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
  // --- END FIXED renderMedia ---

  return (
    <div
      className={cn(
        "w-full py-1 clear-both",
        "my-0.5 relative isolate",
        highlightOriginal &&
          "bg-yellow-100 dark:bg-yellow-900/30 transition-all duration-300 ease-in-out",
      )}
      style={{ isolation: "isolate" }}
      data-message-id={typeof message.id === 'string' ? parseInt(message.id) : message.id}
      id={`msg-${message.id}`}
    >
      <div
        className={cn(
          "flex items-center gap-2 relative mx-3",
          isCurrentUser ? "flex-row-reverse" : "flex-row",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        ref={messageRef}
      >
        <div
          className={cn(
            "w-7 h-7 flex-shrink-0 self-center",
            isCurrentUser ? "ml-2" : "mr-2",
          )}
        >
          <Avatar className="w-full h-full">
            {(isCurrentUser ? currentUser?.avatar : message.user?.avatar) ? (
              <AvatarImage
                src={
                  (isCurrentUser ? currentUser?.avatar : message.user?.avatar) ?? undefined
                }
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
                  ? currentUser?.username?.substring(0, 2).toUpperCase()
                  : message.user?.username?.substring(0, 2).toUpperCase() ||
                    "U"}
              </AvatarFallback>
            )}
          </Avatar>
        </div>

        <div
          className={cn(
            "flex flex-col relative",
            "max-w-[75%] md:max-w-[70%]",
            isCurrentUser ? "items-end" : "items-start",
          )}
        >
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
                    // onClick={() => {
                    //   if (message.user?.id) {
                    //     navigate(`/user/${message.user.id}`);
                    //   }
                    // }}
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
          )}          <div className="relative flex items-center">
            {isCurrentUser && (
              <button
                onClick={handleReply}
                className="mr-1 p-1 bg-white dark:bg-gray-800 minecraft-button opacity-70 hover:opacity-100 transition-opacity duration-150"
                title="Trả lời tin nhắn này"
              >
                <CornerUpLeft className="h-3 w-3 text-gray-600 dark:text-gray-300" />
              </button>
            )}            {message.content && (
              <div
                className={cn(
                  "minecraft-message-box mb-1 break-words",
                  isCurrentUser
                    ? `${isCurrentUser ? localStorage.getItem("userMessageColor") || "" : ""}`
                    : "",
                  isReplyMessage ? "minecraft-reply-box" : "",
                )}
              >
                {isReplyMessage && (
                  <div
                    className="minecraft-reply-reference cursor-pointer"
                    onClick={() =>
                      replyToId && scrollToMessageById(replyToId)
                    }
                    title="Nhấn để xem tin nhắn gốc"
                    tabIndex={0}
                    role="button"
                    aria-label="Xem tin nhắn gốc được trả lời"
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        replyToId && scrollToMessageById(replyToId);
                      }
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-green-400 flex-shrink-0"
                    >
                      <polyline points="9 14 4 9 9 4"></polyline>
                      <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                    </svg>
                    <span className="truncate minecraft-font">
                      <span className="text-green-400 hover:underline">
                        {originalMessage?.user?.username || "Unknown User"}
                      </span>
                      <span className="opacity-80">
                        {" "}
                        {originalMessage?.content &&
                        originalMessage.content.length > 0
                          ? originalMessage.content.length > 20
                            ? originalMessage.content.substring(0, 20) + "..."
                            : originalMessage.content
                          : "Tin nhắn gốc không có sẵn"}
                      </span>
                    </span>
                  </div>
                )}

                {isReplyMessage &&
                  originalMessage?.user?.username &&
                  !message.content.includes(
                    `@${originalMessage.user.username}`,
                  ) && (
                    <span className="text-green-400 font-semibold mr-1">
                      @{originalMessage.user.username}
                    </span>
                  )}

                {isReplyMessage && !originalMessage && (
                  <div className="absolute -top-3 left-2 text-xs px-2 py-1 minecraft-panel border border-yellow-700 text-yellow-400">
                    Trả lời tin nhắn đã bị xóa hoặc hết hạn
                  </div>
                )}

                <div className="text-sm leading-relaxed break-words whitespace-pre-line message-text">
                  {parseMessageContent(message.content)}
                </div>
              </div>
            )}            {!isCurrentUser && (
              <button
                onClick={handleReply}
                className="ml-1.5 p-1 bg-white dark:bg-gray-800 minecraft-button opacity-70 hover:opacity-100 transition-opacity duration-150"
                title="Trả lời tin nhắn này"
              >
                <CornerUpLeft className="h-3 w-3 text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>

          <div
            className={cn("w-full", isCurrentUser ? "flex justify-end" : "")}
          >
            {renderMedia()}
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

export const Message = memo(MessageComponent);