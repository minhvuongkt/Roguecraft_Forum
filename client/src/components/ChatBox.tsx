import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useChat } from "@/hooks/useChat";
import { Message } from "@/components/Message";
import { MessageInput } from "@/components/ui/message-input";
import { Button } from "@/components/ui/button";
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
  BellDot,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { VariableSizeList as VirtualList } from "react-window";
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

export function ChatBox() {
  const { groupedMessages, sendMessage } = useChat();
  const { isConnected, onlineUsers } = useWebSocket();
  const { user, setTemporaryUser } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VirtualList>(null);

  const [state, setState] = useState({
    autoScroll: true,
    isUsernameDialogOpen: false,
    username: "",
    isSubmitting: false,
    replyingTo: null as ChatMessage | null,
    searchTerm: "",
    isScrolling: false,
    newMessagesCount: 0,
    lastReadMessageId: "",
    lastMessageHeight: 0,
  });

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
  const flattenedMessages = useMemo(() => {
    const flattened: {
      message: ChatMessage;
      showUser: boolean;
      dateHeader?: string;
      isNewMessage?: boolean;
    }[] = [];

    // Lấy ID của tin nhắn cuối cùng đã đọc trước đó
    const lastReadId = state.lastReadMessageId;
    let foundNewMessages = false;
    let newMessagesCount = 0;

    Object.entries(filteredGroupedMessages).forEach(([date, messages]) => {
      // Add date header
      const dateString =
        date === new Date().toLocaleDateString("vi-VN") ? "Hôm nay" : date;
      if (messages.length > 0) {
        flattened.push({
          message: messages[0],
          showUser: false,
          dateHeader: dateString,
        });
      }

      // Add messages
      messages.forEach((message, index) => {
        // Kiểm tra tin nhắn mới
        const isNewMessage = lastReadId
          ? lastReadId !== message.id &&
            !foundNewMessages &&
            message.createdAt > new Date(Date.now() - 30000).toISOString()
          : false;

        if (isNewMessage) {
          foundNewMessages = true;
          newMessagesCount += 1;
        }

        flattened.push({
          message,
          showUser:
            index === 0 || messages[index - 1]?.userId !== message.userId,
          dateHeader: undefined,
          isNewMessage,
        });
      });
    });

    // Cập nhật số tin nhắn mới
    if (state.newMessagesCount !== newMessagesCount && newMessagesCount > 0) {
      // Dùng setTimeout để tránh lỗi "Cannot update a component while rendering a different component"
      setTimeout(() => {
        setState((prev) => ({ ...prev, newMessagesCount }));
      }, 0);
    }

    return flattened;
  }, [filteredGroupedMessages, state.lastReadMessageId]);

  // Sử dụng ref để theo dõi độ dài trước đó của danh sách tin nhắn
  const prevMessagesLengthRef = useRef(flattenedMessages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const currentLength = flattenedMessages.length;
    const prevLength = prevMessagesLengthRef.current;

    // Nếu có tin nhắn mới
    if (currentLength > prevLength) {
      if (state.autoScroll) {
        // Đợi một chút để DOM cập nhật
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollToItem(currentLength - 1, "end");
            // Đánh dấu tất cả đã đọc khi tự động cuộn
            markAllAsRead();
          }
        }, 100);
      } else {
        // Nếu người dùng đang xem tin nhắn cũ, hiển thị thông báo
        const latestMessage = flattenedMessages[currentLength - 1]?.message;
        if (latestMessage) {
          setState((prev) => ({
            ...prev,
            lastReadMessageId:
              prev.lastReadMessageId || String(latestMessage.id),
          }));
        }
      }
    }

    // Cập nhật ref
    prevMessagesLengthRef.current = currentLength;
  }, [flattenedMessages.length, state.autoScroll]);

  // Handle scroll to detect when user manually scrolls up
  // const handleScroll = useCallback(
  //   ({
  //     scrollOffset,
  //     scrollUpdateWasRequested,
  //   }: {
  //     scrollOffset: number;
  //     scrollUpdateWasRequested: boolean;
  //   }) => {
  //     if (scrollUpdateWasRequested) return;

  //     setState((prev) => ({
  //       ...prev,
  //       isScrolling: true,
  //     }));

  //     // Giải phóng trạng thái isScrolling sau một thời gian
  //     setTimeout(() => {
  //       setState((prev) => ({ ...prev, isScrolling: false }));
  //     }, 150);

  //     // Tính toán vị trí cuộn và chiều cao để xác định trạng thái autoScroll
  //     if (listRef.current) {
  //       const listHeight = listRef.current._outerRef.clientHeight;
  //       const contentHeight = listRef.current._outerRef.scrollHeight;
  //       const distanceFromBottom = contentHeight - scrollOffset - listHeight;

  //       const isNearBottom = distanceFromBottom < 100;

  //       if (isNearBottom !== state.autoScroll) {
  //         setState((prev) => ({
  //           ...prev,
  //           autoScroll: isNearBottom,
  //         }));

  //         // Nếu người dùng cuộn xuống cuối, đánh dấu tất cả là đã đọc
  //         if (isNearBottom) {
  //           markAllAsRead();
  //         }
  //       }
  //     }
  //   },
  //   [state.autoScroll],
  // );
  const handleScroll = useCallback(
    ({
      scrollOffset,
      scrollUpdateWasRequested,
    }: {
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => {
      if (scrollUpdateWasRequested) return;

      setState((prev) => ({
        ...prev,
        isScrolling: true,
      }));

      // Giải phóng trạng thái isScrolling sau một thời gian
      setTimeout(() => {
        setState((prev) => ({ ...prev, isScrolling: false }));
      }, 150);

      // Tính toán vị trí cuộn và chiều cao để xác định trạng thái autoScroll
      if (scrollRef.current) {
        const listHeight = listRef.current?._outerRef?.clientHeight || 0;
        const contentHeight = scrollRef.current?.scrollHeight || 0;
        const distanceFromBottom = contentHeight - scrollOffset - listHeight;

        const isNearBottom = distanceFromBottom < 100;

        if (isNearBottom !== state.autoScroll) {
          setState((prev) => ({
            ...prev,
            autoScroll: isNearBottom,
          }));

          // Nếu người dùng cuộn xuống cuối, đánh dấu tất cả là đã đọc
          if (isNearBottom) {
            markAllAsRead();
          }
        }
      }
    },
    [state.autoScroll],
  );
  // Đánh dấu tất cả tin nhắn là đã đọc
  const markAllAsRead = useCallback(() => {
    if (flattenedMessages.length > 0) {
      const lastMessage =
        flattenedMessages[flattenedMessages.length - 1].message;
      setState((prev) => ({
        ...prev,
        lastReadMessageId: lastMessage.id.toString(),
        newMessagesCount: 0,
      }));
    }
  }, [flattenedMessages]);

  // Handle reply to a message
  const handleReplyToMessage = useCallback((message: ChatMessage) => {
    setState((prev) => ({ ...prev, replyingTo: message }));
  }, []);

  // Handle canceling a reply
  const handleCancelReply = useCallback(() => {
    setState((prev) => ({ ...prev, replyingTo: null }));
  }, []);

  // Handle sending a message with kiểm tra media hợp lệ
  const handleSendMessage = useCallback(
    (message: string, media?: any) => {
      // Check if message starts with /ten command
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

      // Kiểm tra media hợp lệ
      if (media && typeof media !== "object") {
        console.error("Media không hợp lệ:", media);
        toast({
          title: "Lỗi tải lên",
          description: "Định dạng media không hợp lệ",
          variant: "destructive",
        });
        return;
      }

      // Nếu đang trả lời, thêm mention vào nội dung
      let finalMessage = message;
      if (state.replyingTo && state.replyingTo.user) {
        // Nếu tin nhắn chưa có mention người dùng, thêm vào
        if (!message.includes(`@${state.replyingTo.user.username}`)) {
          finalMessage = `@${state.replyingTo.user.username} ${message}`;
        }
      }

      // Gửi tin nhắn với media đã được upload
      sendMessage(finalMessage, media);
      setState((prev) => ({
        ...prev,
        replyingTo: null,
        autoScroll: true,
      }));

      // Đảm bảo cuộn xuống và đánh dấu đã đọc sau khi gửi tin nhắn
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollToItem(flattenedMessages.length, "end");
          markAllAsRead();
        }
      }, 100);
    },
    [
      user,
      state.replyingTo,
      toast,
      sendMessage,
      flattenedMessages.length,
      markAllAsRead,
    ],
  );

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
        title: "Đặt tên thành công",
        description: `Bạn có thể chat với tên hiển thị là "${newUsername}"`,
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
        description: "Không thể đặt tên. Vui lòng thử lại sau",
        variant: "destructive",
      });
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Handlers để cập nhật các state riêng lẻ
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

  const scrollToBottom = useCallback(() => {
    setState((prev) => ({ ...prev, autoScroll: true }));
    if (listRef.current && flattenedMessages.length > 0) {
      listRef.current.scrollToItem(flattenedMessages.length - 1, "end");
      // Đánh dấu tất cả là đã đọc khi cuộn xuống
      markAllAsRead();
    }
  }, [flattenedMessages.length, markAllAsRead]);

  // Đo kích thước dựa vào điều kiện message
  const getItemSize = useCallback(
    (index: number) => {
      const item = flattenedMessages[index];
      if (!item) return 70;

      if (item.dateHeader) {
        return 40; // Kích thước cho date header
      }

      // Nếu là message có media, cho kích thước lớn hơn
      if (item.message.media) {
        return 200;
      }

      // Ước tính kích thước dựa vào độ dài nội dung
      const contentLength = item.message.content?.length || 0;
      if (contentLength > 200) {
        return 120; // Tin nhắn dài
      } else if (contentLength > 100) {
        return 90; // Tin nhắn trung bình
      }

      return 70; // Tin nhắn ngắn
    },
    [flattenedMessages],
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow h-[calc(100vh-150px)] md:h-[calc(100vh-120px)] flex flex-col border border-gray-200 dark:border-gray-800">
      {/* Chat Header */}
      <div className="p-3 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-lg">
        <div className="flex items-center">
          <h2 className="font-semibold text-base flex items-center gap-2">
            {isConnected ? (
              <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            ) : (
              <span className="ml-2 inline-flex h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"></span>
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

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            title="Tùy chọn khác"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 relative overflow-hidden">
        {/* Thông báo người dùng chưa đăng nhập */}
        {!user && (
          <div className="absolute top-0 left-0 right-0 bg-amber-50 dark:bg-amber-950/30 p-3 text-center z-10 flex items-center justify-center border-b border-amber-100 dark:border-amber-800/50 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              Vui lòng{" "}
              <button
                onClick={() => toggleUsernameDialog(true)}
                className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100"
              >
                đặt tên hiển thị
              </button>{" "}
              để tham gia trò chuyện
            </span>
          </div>
        )}

        {/* Thanh thời gian hiển thị */}
        <div className="sticky top-0 z-10 flex items-center justify-center pt-3 pb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative px-3 py-1 bg-white/80 dark:bg-gray-900/80 text-xs text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700 backdrop-blur-sm flex items-center gap-1.5 shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-default">
                  <Clock className="h-3 w-3" />
                  <span>Tin nhắn trong 3 ngày gần đây</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Tin nhắn cũ hơn sẽ được lưu trữ</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className={`h-[calc(100%-40px)] ${!user ? "pt-10" : "pt-2"}`}>
          {/* Nút "tin mới nhất" được cải tiến */}
          {(!state.autoScroll || state.newMessagesCount > 0) && (
            <div className="absolute bottom-4 right-4 z-10">
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full shadow-md border-gray-200 dark:border-gray-700 ${
                  state.newMessagesCount > 0
                    ? "bg-blue-500 text-white hover:bg-blue-600 border-blue-600"
                    : "bg-white dark:bg-gray-800"
                } flex items-center gap-1.5 px-3 py-1 h-8 transition-all`}
                onClick={scrollToBottom}
                disabled={state.isScrolling}
              >
                {state.isScrolling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : state.newMessagesCount > 0 ? (
                  <>
                    <BellDot className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">
                      {state.newMessagesCount} tin nhắn mới
                    </span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span className="text-xs">Tin mới nhất</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {flattenedMessages.length > 0 ? (
            <VirtualList
              ref={listRef}
              height={400} // Sử dụng ước tính, AutoSizer sẽ cập nhật chính xác hơn
              width="100%"
              itemCount={flattenedMessages.length}
              itemSize={getItemSize} // Sử dụng hàm ước tính kích thước
              onScroll={handleScroll}
              className="px-4"
              overscanCount={3} // Giảm để tối ưu hiệu năng
              initialScrollOffset={0}
            >
              {({ index, style }) => {
                const item = flattenedMessages[index];
                return (
                  <div style={{ ...style, height: "auto" }}>
                    {item.dateHeader && (
                      <div className="flex items-center justify-center my-2 relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                        </div>
                        <div className="relative px-3 py-0.5 bg-white dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                          {item.dateHeader}
                        </div>
                      </div>
                    )}
                    {!item.dateHeader && (
                      <Message
                        key={item.message.id}
                        message={item.message}
                        showUser={item.showUser}
                        onReply={handleReplyToMessage}
                        isNewMessage={item.isNewMessage}
                      />
                    )}
                  </div>
                );
              }}
            </VirtualList>
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

      {/* Chat Input */}
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
                đặt tên hiển thị
              </button>{" "}
              trước khi có thể gửi tin nhắn
            </div>
          </div>
        )}

        {/* Reply info bar */}
        {state.replyingTo && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-700 rounded-md p-2 mb-3 flex items-center justify-between">
            <div className="flex items-center overflow-hidden">
              <div className="flex-shrink-0 mr-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                  <CornerUpLeft className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center">
                  Đang trả lời{" "}
                  <span className="font-semibold ml-1">
                    {state.replyingTo.user?.username || "Người dùng ẩn danh"}
                  </span>
                </div>
                <div className="text-xs text-blue-600/70 dark:text-blue-400/70 truncate max-w-[200px] md:max-w-[300px] lg:max-w-[400px]">
                  {state.replyingTo.content}
                </div>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancelReply}
              className="h-6 w-6 rounded-full hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
            >
              <X className="h-3 w-3 text-blue-700 dark:text-blue-300" />
            </Button>
          </div>
        )}

        <MessageInput
          onSend={handleSendMessage}
          placeholder={
            user
              ? state.replyingTo
                ? `Trả lời ${state.replyingTo.user?.username || "người dùng"}...`
                : "Nhập tin nhắn..."
              : "Nhập /ten [tên của bạn] để đặt tên"
          }
          type="chat"
          disabled={!user}
        />
        <div className="mt-1 text-xs text-muted-foreground px-2">
          Tin nhắn được lưu trữ tối đa trong 4 ngày. Gõ @ để tag người dùng.
        </div>
      </div>

      {/* Username Dialog */}
      <Dialog
        open={state.isUsernameDialogOpen}
        onOpenChange={toggleUsernameDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt tên để tham gia trò chuyện</DialogTitle>
            <DialogDescription>
              Nhập tên bạn muốn sử dụng trong phòng chat. Tên này sẽ hiển thị
              khi bạn gửi tin nhắn.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="username" className="text-left">
              Tên của bạn
            </Label>
            <Input
              id="username"
              value={state.username}
              onChange={handleUsernameChange}
              placeholder="Nhập tên của bạn"
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
          <DialogFooter>
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
              {state.isSubmitting ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
