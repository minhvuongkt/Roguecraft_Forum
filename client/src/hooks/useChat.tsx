import { useState, useCallback, useEffect } from "react";
import { useWebSocket, ChatMessage } from "@/contexts/WebSocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import React from "react";

export function useChat() {
  const {
    messages,
    sendMessage: wsSendMessage,
    replyToMessageId,
    setUsername,
    setReplyToMessageId,
  } = useWebSocket();
  const { user, setTemporaryUser } = useAuth();
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [groupedMessages, setGroupedMessages] = useState<
    Record<string, ChatMessage[]>
  >({});
  const { toast } = useToast();

  // Group messages by date
  useEffect(() => {
    // Filter messages from the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const filtered = messages.filter(
      (msg) => new Date(msg.createdAt) >= threeDaysAgo,
    );

    setFilteredMessages(filtered);

    // Group messages by date
    const groups: Record<string, ChatMessage[]> = {};

    filtered.forEach((message) => {
      const date = new Date(message.createdAt);
      const dateString = date.toLocaleDateString("vi-VN");

      if (!groups[dateString]) {
        groups[dateString] = [];
      }

      groups[dateString].push(message);
    });

    setGroupedMessages(groups);
  }, [messages]);

  // Extract mentions from a message
  const extractMentions = useCallback((message: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(message)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }, []);

  // Handle chat commands
  const handleSendMessage = useCallback(
    (input: string, media?: any, replyTo?: ChatMessage | null) => {
      // Check if it's a command
      if (input.startsWith("/")) {
        // Command to set username: /ten [name]
        if (input.startsWith("/ten ")) {
          const username = input.substring(5).trim();

          if (username.length < 3) {
            toast({
              title: "Lỗi",
              description: "Tên phải có ít nhất 3 ký tự",
              variant: "destructive",
            });
            return;
          }

          if (username.length > 20) {
            toast({
              title: "Lỗi",
              description: "Tên không được quá 20 ký tự",
              variant: "destructive",
            });
            return;
          }

          // Set username via API and WebSocket
          setTemporaryUser(username)
            .then(() => {
              setUsername(username);
            })
            .catch((error) => {
              console.error("Failed to set username:", error);
            });

          return;
        }

        // Unknown command
        toast({
          title: "Lệnh không hợp lệ",
          description: "Lệnh không được hỗ trợ. Thử /ten [tên của bạn]",
          variant: "destructive",
        });
        return;
      }

      // Regular message
      if (!user) {
        toast({
          title: "Bạn chưa đăng nhập",
          description:
            "Sử dụng lệnh /ten [tên của bạn] để đặt tên trước khi chat",
          variant: "destructive",
        });
        return;
      }

      // Check message length
      if (input.length > 1000) {
        toast({
          title: "Tin nhắn quá dài",
          description: "Tin nhắn không được quá 1000 ký tự",
          variant: "destructive",
        });
        return;
      }

      // Extract @mentions from the message
      const mentions = extractMentions(input);

      // Set reply ID if replying to a message
      const replyToId = replyTo ? replyTo.id : null;

      // If replying, make sure to add the username mention if not already included
      let finalMessage = input;
      if (
        replyTo &&
        replyTo.user &&
        !input.includes(`@${replyTo.user.username}`)
      ) {
        finalMessage = `@${replyTo.user.username} ${input}`;
      }

      // Set the replyToMessageId in the WebSocket context
      if (replyToId) {
        setReplyToMessageId(replyToId);
      }

      // Send the message with any media attachment and replyToId
      wsSendMessage(
        finalMessage,
        media,
        mentions.length > 0 ? mentions : undefined,
        replyToId,
      );
    },
    [
      user,
      wsSendMessage,
      setUsername,
      setTemporaryUser,
      toast,
      extractMentions,
      setReplyToMessageId,
    ],
  );

  // Parse message content to highlight mentions
  const parseMessageContent = useCallback((content: string) => {
    const parts = content.split(/(@\w+)/g);

    return (
      <React.Fragment>
        {parts.map((part, index) => {
          if (part.match(/@\w+/)) {
            return (
              <span key={index} className="text-primary font-medium">
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </React.Fragment>
    );
  }, []);

  return {
    messages: filteredMessages,
    groupedMessages,
    sendMessage: handleSendMessage,
    extractMentions,
    parseMessageContent,
  };
}
