import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '@/hooks/useChat';
import { Message } from '@/components/Message';
import { MessageInput } from '@/components/ui/message-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, MoreVertical, Send, User, AlertCircle, X, CornerUpLeft, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { FixedSizeList as VirtualList } from 'react-window';
import { ChatMessage } from '@/types';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function ChatBox() {
  const { groupedMessages, sendMessage } = useChat();
  const { isConnected, onlineUsers } = useWebSocket();
  const { user, setTemporaryUser } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VirtualList>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  // Create flattened message list for virtual scrolling
  const flattenedMessages = useMemo(() => {
    const flattened: {
      message: any;
      showUser: boolean;
      dateHeader?: string;
    }[] = [];
    
    Object.entries(groupedMessages).forEach(([date, messages]) => {
      // Add date header
      const dateString = date === new Date().toLocaleDateString('vi-VN') ? 'Hôm nay' : date;
      if (messages.length > 0) {
        flattened.push({
          message: messages[0],
          showUser: false,
          dateHeader: dateString
        });
      }
      
      // Add messages
      messages.forEach((message, index) => {
        flattened.push({
          message,
          showUser: index === 0 || messages[index - 1]?.userId !== message.userId,
          dateHeader: undefined
        });
      });
    });
    
    return flattened;
  }, [groupedMessages]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollToItem(flattenedMessages.length - 1, 'end');
    }
  }, [flattenedMessages.length, autoScroll]);
  
  // Handle scroll to detect when user manually scrolls up
  const handleScroll = ({ scrollOffset, scrollUpdateWasRequested }: { scrollOffset: number, scrollUpdateWasRequested: boolean }) => {
    if (scrollUpdateWasRequested) return;
    
    // Assuming the message list container is 400px tall - adjust based on your layout
    const listHeight = 400;
    const maxScrollOffset = flattenedMessages.length * 80 - listHeight; // 80px avg height per message
    const isNearBottom = scrollOffset > maxScrollOffset - 100;
    
    setAutoScroll(isNearBottom);
  };
  
  // Handle reply to a message
  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyingTo(message);
  };
  
  // Handle canceling a reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };
  
  // Handle sending a message
  const handleSendMessage = (message: string, media?: any) => {
    // Check if message starts with /ten command
    if (message.startsWith('/ten ')) {
      const newUsername = message.substring(5).trim();
      if (newUsername) {
        handleSetUsername(newUsername);
        return;
      }
    }
    
    if (!user) {
      setIsUsernameDialogOpen(true);
      return;
    }
    
    // Nếu đang trả lời, thêm mention vào nội dung
    let finalMessage = message;
    if (replyingTo && replyingTo.user) {
      // Nếu tin nhắn chưa có mention người dùng, thêm vào
      if (!message.includes(`@${replyingTo.user.username}`)) {
        finalMessage = `@${replyingTo.user.username} ${message}`;
      }
    }
    
    // MessageInput component đã xử lý upload file và trả về media object
    // với định dạng {"1": "/chat-images/..."}
    console.log("Sending message with media:", media);
    
    // Gửi tin nhắn với media đã được upload
    sendMessage(finalMessage, media);
    setReplyingTo(null); // Reset reply state
    setAutoScroll(true);
  };
  
  const handleSetUsername = async (newUsername: string) => {
    if (!newUsername || newUsername.trim() === '') {
      toast({
        title: "Tên người dùng không hợp lệ",
        description: "Vui lòng nhập tên hợp lệ",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await setTemporaryUser(newUsername);
      toast({
        title: "Đặt tên thành công",
        description: `Bạn đã được đặt tên là "${newUsername}"`,
        variant: "default"
      });
      setIsUsernameDialogOpen(false);
    } catch (error) {
      toast({
        title: "Lỗi khi đặt tên",
        description: "Không thể đặt tên. Vui lòng thử lại sau",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setUsername('');
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow h-[calc(100vh-150px)] md:h-[calc(100vh-120px)] flex flex-col border border-gray-200 dark:border-gray-800">
      {/* Chat Header */}
      <div className="p-3 border-b dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-lg">
        <div className="flex items-center">
          <h2 className="font-semibold text-base">
            Chat trong cộng đồng
            {isConnected && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-green-500"></span>}
            {!isConnected && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>}
          </h2>
          <div className="ml-3 bg-gray-200/70 dark:bg-gray-800/70 rounded-full px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300 flex items-center">
            <span>{onlineUsers.length} online</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Tìm kiếm">
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
          {!user && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsUsernameDialogOpen(true)}
              className="flex items-center gap-1 text-xs h-8 rounded-full"
            >
              <User className="h-3.5 w-3.5" />
              <span>Đặt tên</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Tùy chọn khác">
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
              Vui lòng <button onClick={() => setIsUsernameDialogOpen(true)} className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100">đặt tên hiển thị</button> để tham gia trò chuyện
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
                  <span>Hiển thị tin nhắn từ 3 ngày gần đây</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Tin nhắn cũ hơn sẽ được lưu trữ</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {flattenedMessages.length > 0 ? (
          <div className={`h-[calc(100%-40px)] ${!user ? 'pt-10' : 'pt-2'}`}>
            {!autoScroll && (
              <div className="absolute bottom-4 right-4 z-10">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-1 px-3 py-1 h-8"
                  onClick={() => {
                    setAutoScroll(true);
                    listRef.current?.scrollToItem(flattenedMessages.length - 1, 'end');
                  }}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="text-xs">Cuối</span>
                </Button>
              </div>
            )}
            
            <VirtualList
              ref={listRef}
              height={400}
              width="100%"
              itemCount={flattenedMessages.length}
              itemSize={60} // Giảm kích thước mặc định để tin nhắn gần nhau hơn
              onScroll={handleScroll}
              className="px-4"
              overscanCount={5} // Tăng số lượng tin nhắn preload để tránh hiện tượng nhấp nháy
            >
              {({ index, style }) => {
                const item = flattenedMessages[index];
                return (
                  <div style={{ ...style, height: 'auto' }}>
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
                      />
                    )}
                  </div>
                );
              }}
            </VirtualList>
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-48 px-4 mt-6">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <Send className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
              Chưa có tin nhắn nào trong khoảng thời gian này.<br/>Hãy bắt đầu cuộc trò chuyện!
            </p>
          </div>
        )}
      </div>
      
      {/* Chat Input */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        {!user && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3 flex items-center border border-blue-100 dark:border-blue-800/70">
            <AlertCircle className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              Bạn cần <button onClick={() => setIsUsernameDialogOpen(true)} className="font-semibold text-blue-600 dark:text-blue-300 hover:underline">đặt tên hiển thị</button> trước khi có thể gửi tin nhắn
            </div>
          </div>
        )}
        
        {/* Reply info bar */}
        {replyingTo && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-700 rounded-md p-2 mb-3 flex items-center justify-between">
            <div className="flex items-center overflow-hidden">
              <div className="flex-shrink-0 mr-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                  <CornerUpLeft className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center">
                  Đang trả lời <span className="font-semibold ml-1">{replyingTo.user?.username || 'Unknown'}</span>
                </div>
                <div className="text-xs text-blue-600/70 dark:text-blue-400/70 truncate max-w-[200px]">
                  {replyingTo.content}
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
          placeholder={user 
            ? replyingTo 
              ? `Trả lời ${replyingTo.user?.username || 'user'}...` 
              : "Nhập tin nhắn..." 
            : "Nhập /ten [tên của bạn] để đặt tên"
          }
          type="chat"
          disabled={!user}
        />
        <div className="mt-1 text-xs text-muted-foreground px-2">
          Tin nhắn được lưu trong 4 ngày. Gõ @ để tag người dùng.
        </div>
      </div>

      {/* Username Dialog */}
      <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đặt tên để tham gia trò chuyện</DialogTitle>
            <DialogDescription>
              Nhập tên bạn muốn sử dụng trong phòng chat. Tên này sẽ hiển thị khi bạn gửi tin nhắn.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="username" className="text-left">
              Tên của bạn
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên của bạn"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUsernameDialogOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button 
              onClick={() => handleSetUsername(username)}
              disabled={!username || isSubmitting}
            >
              {isSubmitting ? "Đang xử lý..." : "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
