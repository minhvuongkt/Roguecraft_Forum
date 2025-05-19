import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { ReplyPreview } from "./ReplyPreview";
import { useChat } from "@/hooks/useChat";
import { MinecraftMessage } from "@/components/MinecraftMessage";
import { Message } from "@/components/Message";
import { MessageInput } from "@/components/ui/message-input";
import { Button } from "@/components/ui/button";
import { TypingIndicator } from "./TypingIndicator";
import { MessageColorPicker } from "./MessageColorPicker";
import { MessengerReplyIndicator } from "./MessengerReplyIndicator";
import { MinecraftChatbox } from "./MinecraftChatbox";
import { toVNTime } from '@/lib/dayjs';
import {
  MoreVertical,
  Send,
  User,
  AlertCircle,
  X,
  CornerUpLeft,
  Clock,
  ChevronDown,
  Loader2,
  Info,
  Bell,
  BellOff,
  Trash2,
  Settings,
  Moon,
  Sun,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { ChatMessage } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatSearch } from "@/components/ui/chat-search";
import AutoSizer from "react-virtualized-auto-sizer";
import { VariableSizeList as VirtualList } from "react-window";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Warning } from "postcss";
import { Alert } from "./ui/alert";

// Kích thước tin nhắn mặc định và với media
const DEFAULT_MESSAGE_HEIGHT = 60;
const MESSAGE_WITH_MEDIA_HEIGHT = 180;

// UserMentionSelector component for @mentions
interface UserMentionSelectorProps {
  users: Array<{ id: string; username: string; avatar?: string }>;
  currentUserId: string | undefined;
  searchTerm: string;
  onSelect: (user: { id: string; username: string }) => void;
  onClose: () => void;
  position: { top: number; left: number } | null;
}

function UserMentionSelector({
  users,
  currentUserId,
  searchTerm,
  onSelect,
  onClose,
  position,
}: UserMentionSelectorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Filter users based on search term and remove current user
  const filteredUsers = useMemo(() => {
    // Filter out the current user
    const usersWithoutSelf = users.filter((user) => user.id !== currentUserId);

    // Then filter by search term
    if (!searchTerm) return usersWithoutSelf;

    const term = searchTerm.toLowerCase();
    return usersWithoutSelf.filter((user) =>
      user.username.toLowerCase().includes(term),
    );
  }, [users, searchTerm, currentUserId]);

  // Calculate user status summary
  const onlineCount = filteredUsers.length;

  // Reset focused index when filtered users change
  useEffect(() => {
    setFocusedIndex(0);
  }, [filteredUsers.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!position) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < filteredUsers.length - 1 ? prev + 1 : prev,
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case "Enter":
          e.preventDefault();
          if (filteredUsers[focusedIndex]) {
            onSelect(filteredUsers[focusedIndex]);
          }
          break;

        case "Escape":
          e.preventDefault();
          onClose();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredUsers, focusedIndex, onSelect, onClose, position]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden w-[280px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          {onlineCount} người dùng online
        </div>
      </div>
      {filteredUsers.length === 0 ? (
        <div className="p-4 text-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Không tìm thấy người dùng
          </div>
        </div>
      ) : (
        <div className="py-2 max-h-[240px] overflow-y-auto">
          {filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className={cn(
                "px-3 py-2 flex items-center gap-3 cursor-pointer group transition-colors",
                focusedIndex === index
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
              )}
              onClick={() => onSelect(user)}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-white dark:border-gray-900">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {user.username.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.username}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded group-hover:bg-gray-200 dark:group-hover:bg-gray-700">
                    @{user.username}
                  </span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-green-500"></span>
                  Đang hoạt động
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatBox() {
  const { groupedMessages, sendMessage } = useChat();
  const { isConnected, onlineUsers } = useWebSocket();
  const { user, setTemporaryUser } = useAuth();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VirtualList>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageHeightsRef = useRef<{ [key: string]: number }>({});

  // Auto-scroll tracking refs
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState({
    autoScroll: true,
    isUsernameDialogOpen: false,
    username: "",
    isSubmitting: false,
    replyingTo: null as ChatMessage | null,
    searchTerm: "",
    isScrolling: false,
    showScrollButton: false,
    typingUsers: [] as {
      id: number;
      username: string;
      avatar: string | null;
    }[],
    userMessageColor:
      localStorage.getItem("userMessageColor") || "bg-purple-600",
    mentionState: {
      active: false,
      searchTerm: "",
      triggerPosition: null as { top: number; left: number } | null,
    },
  });

  // For settings dropdown
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const totalMessageCount = useMemo(() => {
    return Object.values(groupedMessages).reduce(
      (acc, messages) => acc + messages.length,
      0,
    );
  }, [groupedMessages]);

  // Filter messages based on search term
  const filteredGroupedMessages = useMemo(() => {
    if (!state.searchTerm.trim()) {
      return groupedMessages;
    }

    const searchTermLower = state.searchTerm.toLowerCase();
    const filtered: Record<string, ChatMessage[]> = {};

    Object.entries(groupedMessages).forEach(([date, messages]) => {
      const filteredMessages = messages.filter(
        (message) =>
          message.content.toLowerCase().includes(searchTermLower) ||
          message.user?.username?.toLowerCase().includes(searchTermLower),
      );

      if (filteredMessages.length > 0) {
        filtered[date] = filteredMessages;
      }
    });

    return filtered;
  }, [groupedMessages, state.searchTerm]);

  // Create flattened message list for virtual scrolling
  // Define flattenedMessages before using it in any useEffect or functions
  const flattenedMessages = useMemo(() => {
    return Object.entries(filteredGroupedMessages).reduce(
      (acc, [date, messages]) => {        // Add date header
        const dateString =
          date === toVNTime(new Date()).format("DD/MM/YYYY") ? "Hôm nay" : date;

        // Chỉ thêm tiêu đề ngày nếu có tin nhắn
        if (messages.length > 0) {
          acc.push({
            type: "date-header",
            id: `date-${date}`,
            content: dateString,
          });
        }

        // Thêm tin nhắn với thông tin nhóm
        messages.forEach((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const nextMessage =
            index < messages.length - 1 ? messages[index + 1] : null;

          // Kiểm tra xem tin nhắn có thuộc cùng người gửi không để nhóm
          const isFirstInGroup =
            !previousMessage || previousMessage.userId !== message.userId;
          const isLastInGroup =
            !nextMessage || nextMessage.userId !== message.userId;

          acc.push({
            type: "message",
            id: `msg-${message.id}`,
            message,
            isFirstInGroup,
            isLastInGroup,
            showUser: isFirstInGroup,
          });
        });

        return acc;
      },
      [] as Array<{
        type: "date-header" | "message";
        id: string;
        content?: string;
        message?: ChatMessage;
        isFirstInGroup?: boolean;
        isLastInGroup?: boolean;
        showUser?: boolean;
      }>,
    );
  }, [filteredGroupedMessages]);

  useEffect(() => {
    if (totalMessageCount > prevMessageCountRef.current) {
      if (shouldAutoScrollRef.current && !isUserScrollingRef.current) {
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollToItem(flattenedMessages.length - 1, "end");
            setState((prev) => ({ ...prev, showScrollButton: false }));
          }
        }, 100);
      } else {
        setState((prev) => ({ ...prev, showScrollButton: true }));
      }
    }

    prevMessageCountRef.current = totalMessageCount;
  }, [totalMessageCount, flattenedMessages.length]);

  // Initial scroll to bottom when component mounts - AFTER flattenedMessages is defined
  useEffect(() => {
    if (flattenedMessages.length > 0) {
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollToItem(flattenedMessages.length - 1, "end");
        }
      }, 200);
    }
  }, [flattenedMessages.length]);

  const getItemSize = useCallback(
    (index: number): number => {
      const item = flattenedMessages[index];
      if (!item) return DEFAULT_MESSAGE_HEIGHT;

      if (messageHeightsRef.current[item.id]) {
        return messageHeightsRef.current[item.id];
      }
      if (item.type === "date-header") {
        return 40; // Date header height
      }
      if (item.message?.media) {
        return MESSAGE_WITH_MEDIA_HEIGHT;
      }
      return DEFAULT_MESSAGE_HEIGHT;
    },
    [flattenedMessages],
  );

  const setItemSize = useCallback((id: string, height: number) => {
    if (messageHeightsRef.current[id] !== height) {
      messageHeightsRef.current[id] = height;
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    }
  }, []);

  useEffect(() => {
    const handleInputChange = () => {
      if (!inputRef.current) return;

      const text = inputRef.current.value;
      const cursorPosition = inputRef.current.selectionStart || 0;
      const textBeforeCursor = text.substring(0, cursorPosition);
      const atIndex = textBeforeCursor.lastIndexOf("@");
      if (
        atIndex >= 0 &&
        (atIndex === 0 ||
          text[atIndex - 1] === " " ||
          text[atIndex - 1] === "\n")
      ) {
        const searchTerm = textBeforeCursor.substring(atIndex + 1);
        if (!searchTerm.includes(" ")) {
          const inputRect = inputRef.current.getBoundingClientRect();
          const lineHeight = parseInt(
            window.getComputedStyle(inputRef.current).lineHeight,
          );
          const lines = textBeforeCursor.split("\n");
          const currentLineIndex = lines.length - 1;
          const top = inputRect.top + currentLineIndex * lineHeight - 200;
          const left = inputRect.left + 10;
          setState((prev) => ({
            ...prev,
            mentionState: {
              active: true,
              searchTerm,
              triggerPosition: { top, left },
            },
          }));
          return;
        }
      }

      // Close mention dropdown if active but no longer relevant
      if (state.mentionState.active) {
        setState((prev) => ({
          ...prev,
          mentionState: {
            ...prev.mentionState,
            active: false,
            triggerPosition: null,
          },
        }));
      }
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener("input", handleInputChange);
      input.addEventListener("click", handleInputChange);
      input.addEventListener("keyup", handleInputChange);
    }

    return () => {
      if (input) {
        input.removeEventListener("input", handleInputChange);
        input.removeEventListener("click", handleInputChange);
        input.removeEventListener("keyup", handleInputChange);
      }
    };
  }, [state.mentionState.active]);

  const handleSelectMentionUser = useCallback(
    (selectedUser: { id: string; username: string }) => {
      if (!inputRef.current) return;

      const text = inputRef.current.value;
      const cursorPosition = inputRef.current.selectionStart || 0;
      const textBeforeCursor = text.substring(0, cursorPosition);

      const atIndex = textBeforeCursor.lastIndexOf("@");

      if (atIndex >= 0) {
        const existingMentionMatch = text.substring(atIndex).match(/^@(\S+)/);
        const existingMention = existingMentionMatch
          ? existingMentionMatch[0]
          : "@";
        const endOfMentionIndex = atIndex + existingMention.length;
        const newText =
          text.substring(0, atIndex) +
          `@${selectedUser.username} ` +
          text.substring(endOfMentionIndex);

        inputRef.current.value = newText;

        const newCursorPosition = atIndex + selectedUser.username.length + 2;
        inputRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition,
        );

        inputRef.current.focus();
      }

      setState((prev) => ({
        ...prev,
        mentionState: {
          active: false,
          searchTerm: "",
          triggerPosition: null,
        },
      }));
    },
    [],
  );

  const handleScroll = useCallback(
    ({
      scrollOffset,
      scrollUpdateWasRequested,
    }: {
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      if (scrollUpdateWasRequested) return;
      isUserScrollingRef.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 100);

      setState((prev) => ({
        ...prev,
        isScrolling: true,
      }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, isScrolling: false }));
      }, 150);
      if (listRef.current) {
        const listElement = listRef.current as any;
        const listHeight = listElement.props.height;
        const contentHeight = listElement.getTotalSize ? listElement.getTotalSize() : 0;
        const distanceFromBottom = contentHeight - scrollOffset - listHeight;

        const isNearBottom = distanceFromBottom < 100;
        const showButton = distanceFromBottom > 200; // Show button when scrolled up significantly

        // Update auto-scroll behavior
        shouldAutoScrollRef.current = isNearBottom;

        setState((prev) => ({
          ...prev,
          autoScroll: isNearBottom,
          showScrollButton: showButton,
        }));
      }
    },
    [],
  );

  // Xử lý trả lời tin nhắn
  const handleReplyToMessage = useCallback((message: ChatMessage) => {
    setState((prev) => ({ ...prev, replyingTo: message }));
    // Focus input when replying
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Hủy trả lời
  const handleCancelReply = useCallback(() => {
    setState((prev) => ({ ...prev, replyingTo: null }));
  }, []);

  // scrollToBottom function definition
  const scrollToBottom = useCallback(() => {
    // Update state
    shouldAutoScrollRef.current = true;
    isUserScrollingRef.current = false;

    setState((prev) => ({
      ...prev,
      autoScroll: true,
      showScrollButton: false,
    }));

    // Scroll to bottom immediately
    if (listRef.current && flattenedMessages.length > 0) {
      listRef.current.scrollToItem(flattenedMessages.length - 1, "end");
    }
  }, [flattenedMessages.length]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = useCallback(
    (message: string, media?: any) => {
      // Kiểm tra lệnh đặt tên
      if (message.startsWith("/ten ")) {
        const newUsername = message.substring(5).trim();
        if (newUsername) {
          handleSetUsername(newUsername);
          return;
        }
      }
      if (!user) {
        setState((prev) => ({ ...prev, isUsernameDialogOpen: true }));
        return;
      }
      if (media) {
        if (typeof media !== "object") {
          console.error("Media không hợp lệ:", media);
          toast({
            title: "Lỗi tải lên",
            description: "Định dạng media không hợp lệ",
            variant: "destructive",
          });
          return;
        }
        if (Object.keys(media).length === 0) {
          media = undefined;
        }
      }

      let finalMessage = message;
      let replyToMessageId: number | null = null;
      let mentions: string[] = [];

      if (state.replyingTo) {
        // // Xử lý chặt chẽ hơn để đảm bảo replyToMessageId luôn là số nguyên
        // if (typeof state.replyingTo.id === "string") {
        //   // Loại bỏ các ký tự không phải số
        //   const cleanId = String(state.replyingTo.id).replace(/[^0-9]/g, "");
        //   replyToMessageId = cleanId ? parseInt(cleanId) : null;
        // } else if (typeof state.replyingTo.id === "number") {
        //   replyToMessageId = state.replyingTo.id;
        // }

        // // Kiểm tra xem replyToMessageId có phải là số nguyên hợp lệ không
        // if (replyToMessageId === null || isNaN(replyToMessageId)) {
        //   console.error("Invalid replyToMessageId:", state.replyingTo.id);
        //   replyToMessageId = null;
        // }
        replyToMessageId = state.replyingTo.id;
        if (state.replyingTo.user) {
          const username = state.replyingTo.user.username;
          if (!finalMessage.includes(`@${username}`)) {
            finalMessage = `@${username} ${finalMessage}`;
            // Thêm username vào mentions
            mentions.push(username);
          }
        }
      }
      sendMessage(finalMessage, media, state.replyingTo);

      // Reset state and enable auto-scroll
      setState((prev) => ({
        ...prev,
        replyingTo: null,
        autoScroll: true,
        showScrollButton: false,
      }));

      // Enable auto-scroll for the next message
      shouldAutoScrollRef.current = true;
      isUserScrollingRef.current = false;

      // Force scroll to bottom
      setTimeout(() => {
        if (listRef.current && flattenedMessages.length > 0) {
          listRef.current.scrollToItem(flattenedMessages.length - 1, "end");
        }
      }, 100);
    },
    [user, state.replyingTo, toast, sendMessage, flattenedMessages.length],
  );
  // Xử lý đặt tên người dùng
  const handleSetUsername = async (newUsername: string) => {
    if (!newUsername || newUsername.trim() === "") {
      toast({
        title: "Tên người dùng không hợp lệ",
        description: "Vui lòng nhập tên hợp lệ",
        variant: "destructive",
      });
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await setTemporaryUser(newUsername);
      toast({
        title: "Đặt username thành công",
        description: `Bạn có thể chat với username là "${newUsername}"`,
        variant: "default",
      });
      setState((prev) => ({
        ...prev,
        isUsernameDialogOpen: false,
        isSubmitting: false,
        username: "",
      }));
    } catch (error) {
      toast({
        title: "Lỗi khi đặt tên",
        description: `${error}`,
        variant: "destructive",
      });
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Toggle notifications
  const handleToggleNotifications = () => {
    setNotifications((prev) => !prev);
    toast({
      title: notifications ? "Đã tắt thông báo" : "Đã bật thông báo",
      description: notifications
        ? "Bạn sẽ không nhận thông báo mới"
        : "Bạn sẽ nhận thông báo khi có tin nhắn mới",
      variant: "default",
    });
  };

  // Toggle theme
  const handleToggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    // Implement actual theme change logic here
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    toast({
      title: `Đã chuyển sang chế độ ${newTheme === "light" ? "sáng" : "tối"}`,
      variant: "default",
    });
  };

  // Clear chat (implementation would depend on your app)
  const handleClearChat = () => {
    toast({
      title: "Xóa trò chuyện",
      description: "Tính năng này sẽ được triển khai sau",
      variant: "default",
    });
  };

  // Các handler state
  const handleSearchChange = useCallback((term: string) => {
    setState((prev) => ({ ...prev, searchTerm: term }));
  }, []);

  const toggleUsernameDialog = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isUsernameDialogOpen: open }));
  }, []);

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, username: e.target.value }));
    },
    [],
  );

  const ItemRenderer = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const item = flattenedMessages[index];
    const itemRef = useRef<HTMLDivElement>(null);

    // Đo kích thước thực tế sau khi render
    useEffect(() => {
      if (itemRef.current && item) {
        const height = itemRef.current.getBoundingClientRect().height;
        setItemSize(
          item.id,
          Math.max(height + 12, item.type === "date-header" ? 40 : 60),
        );
      }
    }, [item]);

    // Date header
    if (item.type === "date-header") {
      return (
        <div
          style={{ ...style, height: "auto" }}
          ref={itemRef}
          className="py-2 clear-both"
        >
          <div className="flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative px-3 py-0.5 bg-white dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
              {item.content}
            </div>
          </div>
        </div>
      );
    }

    if (item.type === "message" && item.message) {
      return (
        <div
          style={{ ...style, height: "auto" }}
          ref={itemRef}
          className="clear-both" // Ensure nothing floats around this message
        >
          {/* <MinecraftMessage */}
          <Message
            key={item.id}
            message={item.message}
            showUser={item.showUser}
            onReply={handleReplyToMessage}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow h-[calc(100vh-150px)] md:h-[calc(100vh-120px)] flex flex-col border border-gray-200 dark:border-gray-800">
      {/* Chat Header */}
      <div className="p-3 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-lg">
        <div className="flex items-center">
          <h2 className="font-semibold text-base flex items-center gap-2">
            {isConnected ? (
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            ) : (
              <span className="inline-flex h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
            )}
            {!isConnected && (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Đang kết nối...
              </span>
            )}
          </h2>
          <div className="ml-3 bg-gray-200/70 dark:bg-gray-800/70 rounded-full px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300 flex items-center">
            <span>{onlineUsers.length} online</span>
          </div>
        </div>
        <div className="flex space-x-2 items-center">
          <ChatSearch onSearch={handleSearchChange} className="mr-1" />

          {!user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleUsernameDialog(true)}
              className="flex items-center gap-1 text-xs h-8 rounded-full"
            >
              <User className="h-3.5 w-3.5" />
              <span>Đặt tên</span>
            </Button>
          )}

          {/* Settings Menu */}
          <DropdownMenu open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* <DropdownMenuLabel>Cài đặt</DropdownMenuLabel>
              <DropdownMenuSeparator /> */}
              <DropdownMenuItem onClick={handleToggleNotifications}>
                {notifications ? (
                  <BellOff className="mr-2 h-4 w-4" />
                ) : (
                  <Bell className="mr-2 h-4 w-4" />
                )}
                {notifications ? "Tắt thông báo" : "Bật thông báo"}
              </DropdownMenuItem>
              {/* <DropdownMenuItem onClick={handleToggleTheme}>
                {theme === "light" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Sun className="mr-2 h-4 w-4" />
                )}
                {theme === "light" ? "Chế độ tối" : "Chế độ sáng"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearChat}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa trò chuyện
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {/* {!user && (
          <div className="absolute top-0 left-0 right-0 bg-amber-50 dark:bg-amber-950/30 p-3 text-center z-10 flex items-center justify-center border-b border-amber-100 dark:border-amber-800/50 backdrop-blur-sm" role="alert" aria-live="polite">
            <AlertCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Vui lòng{" "}
              <button
                onClick={() => toggleUsernameDialog(true)}
                className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
                aria-label="Đặt username để tham gia trò chuyện"
              >
                đặt username
              </button>{" "}
              để tham gia trò chuyện.
            </span>
          </div>
        )} */}
        <div className="sticky top-0 z-10 flex items-center justify-center pt-3 pb-2" id="chatHistoryNotice" aria-live="polite">
          {/* <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="relative px-3 py-1 bg-white/80 dark:bg-gray-900/80 text-xs text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700 backdrop-blur-sm flex items-center gap-1.5 shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-default fade-in"
                  tabIndex={0}
                  aria-label="Thông báo lịch sử chat"
                >
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>Tin nhắn trong 3 ngày gần đây</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const notice = typeof document !== 'undefined' ?
                        document.getElementById('chatHistoryNotice') : null;
                      if (notice) {
                        notice.classList.add('fade-out');
                        setTimeout(() => {
                          notice.style.display = 'none';
                        }, 250);
                      }
                    }}
                    className="ml-1.5 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    aria-label="Ẩn thông báo lịch sử chat"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Tin nhắn cũ hơn sẽ được lưu trữ</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider> */}
        </div>
        <div className={cn("h-[calc(100%-40px)]", !user && "pt-10")}>
          {flattenedMessages.length > 0 ? (
            <div className="h-full">
              {state.showScrollButton && (
                <div className="absolute bottom-4 right-4 z-10">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-1.5 px-3 py-1 h-8"
                    onClick={scrollToBottom}
                    disabled={state.isScrolling}
                  >
                    {state.isScrolling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    <span className="text-xs">Tin mới nhất</span>
                  </Button>
                </div>
              )}
              <AutoSizer>
                {({ height, width }) => (
                  <VirtualList
                    ref={listRef}
                    height={height}
                    width={width}
                    itemCount={flattenedMessages.length}
                    itemSize={getItemSize}
                    onScroll={handleScroll}
                    className="px-4"
                    overscanCount={5}
                    initialScrollOffset={0}
                    itemData={flattenedMessages}
                  >
                    {ItemRenderer}
                  </VirtualList>
                )}
              </AutoSizer>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-48 px-4 mt-6">
              <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <Send className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                {state.searchTerm ? (
                  <>
                    Không tìm thấy tin nhắn nào phù hợp với "
                    <b>{state.searchTerm}</b>".
                    <br />
                    Thử tìm kiếm với từ khóa khác.
                  </>
                ) : (
                  <>
                    Chưa có tin nhắn nào trong khoảng thời gian này.
                    <br />
                    Hãy bắt đầu cuộc trò chuyện!
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        {!user && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3 flex items-center border border-blue-100 dark:border-blue-800/70">
            <AlertCircle className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              Bạn cần{" "}
              <button
                onClick={() => toggleUsernameDialog(true)}
                className="font-semibold text-blue-600 dark:text-blue-300 hover:underline"
              >
                đặt username
              </button>{" "}
              để gửi tin nhắn (Lưu ý: tài khoản này sẽ bị xoá sau 7 ngày).
            </div>
          </div>
        )}
        {state.typingUsers && state.typingUsers.length > 0 && (
          <div className="mb-2">
            {state.typingUsers.map((typingUser) => (
              <TypingIndicator
                key={typingUser.id}
                username={typingUser.username}
              />
            ))}
          </div>
        )}
        {state.replyingTo && (
          <MessengerReplyIndicator
            message={state.replyingTo}
            onCancel={handleCancelReply}
          />
        )}
        <MinecraftChatbox
          onSend={handleSendMessage}
          disabled={!user}
          placeholder={
            user
              ? state.replyingTo
                ? `Trả lời ${state.replyingTo.user?.username || "người dùng"}...`
                : "Nhập gì đó đê... (Gõ @ để tag người dùng)"
              : "Nhập /ten [tên của bạn] để đặt tên"
          }
          colorPicker={
            <MessageColorPicker
              onColorSelect={(color) => {
                localStorage.setItem("userMessageColor", color);
                setState((prev) => ({
                  ...prev,
                  userMessageColor: color,
                }));
                toast({
                  title: "Đã thay đổi màu tin nhắn",
                  description:
                    "Màu tin nhắn của bạn sẽ được áp dụng cho các tin nhắn tiếp theo",
                  variant: "default",
                });
              }}
            />
          }
        />

        {state.mentionState.active && (
          <UserMentionSelector
            users={onlineUsers.map((u) => ({
              id: String(u.id || Math.random()),
              username: u.username || "Người dùng",
              avatar: u.avatar ?? undefined, // Ensure avatar is string or undefined
            }))}
            currentUserId={user ? String(user.id) : undefined}
            searchTerm={state.mentionState.searchTerm}
            onSelect={handleSelectMentionUser}
            onClose={() =>
              setState((prev) => ({
                ...prev,
                mentionState: {
                  ...prev.mentionState,
                  active: false,
                  triggerPosition: null,
                },
              }))
            }
            position={state.mentionState.triggerPosition}
          />
        )}

        <div className="mt-1 text-xs text-muted-foreground px-2 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
          Tài khoản đặt tạm thời sẽ bị xoá sau 7 ngày.
        </div>
        <div className="mt-1 text-xs text-muted-foreground px-2 flex items-center">
          <Info className="h-3 w-3 mr-1 text-blue-500" />
          Tin nhắn được lưu trữ tối đa trong 3 ngày.
        </div>
      </div>

      {/* Username Dialog */}
      <Dialog
        open={state.isUsernameDialogOpen}
        onOpenChange={toggleUsernameDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt username để tham gia trò chuyện</DialogTitle>
            <DialogDescription >
              <span className="text-sm text-red-500 dark:text-red-400">Đây là tài khoản tạm thời và sau 7 ngày tài khoản sẽ bị xoá cùng các dữ liệu liên quan.</span>
              <br />
              <span className="text-sm text-red-500 dark:text-red-400">Khi bạn đăng xuất thì sẽ không thể đăng nhập lại với tài khoản này.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="username" className="text-left">
              Username của bạn
            </Label>
            <Input
              id="username"
              value={state.username}
              onChange={handleUsernameChange}
              placeholder="Nhập username của bạn..."
              className="mt-1"
              autoFocus
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  state.username &&
                  !state.isSubmitting
                ) {
                  handleSetUsername(state.username);
                }
              }}
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => toggleUsernameDialog(false)}
              disabled={state.isSubmitting}
              className="w-24"
            >
              Hủy
            </Button>
            <Button
              onClick={() => handleSetUsername(state.username)}
              disabled={!state.username || state.isSubmitting}
              className="w-24"
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Xử lý
                </>
              ) : (
                "Xác nhận"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fade-in/fade-out animation for chatHistoryNotice */}
      <style id="chatbox-fade-style">{`
        #chatHistoryNotice.fade-in {
          animation: fadeIn 0.25s;
        }
        #chatHistoryNotice.fade-out {
          animation: fadeOut 0.25s forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
