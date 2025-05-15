import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useChat } from '@/hooks/useChat';
import { Message } from '@/components/Message';
import { MessageInput } from '@/components/ui/message-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, MoreVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { FixedSizeList as VirtualList } from 'react-window';

export function ChatBox() {
  const { groupedMessages, sendMessage } = useChat();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VirtualList>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
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
  
  // Handle sending a message
  const handleSendMessage = (message: string, files?: File[]) => {
    sendMessage(message);
    setAutoScroll(true);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-[calc(100vh-150px)] md:h-[calc(100vh-120px)] flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-bold text-lg">Chat box</h2>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      
      {/* Chat Messages */}
      <ScrollArea 
        className="flex-1 p-4" 
        ref={scrollRef} 
        onScroll={handleScroll}
      >
        <div className="space-y-4">
          {/* System Message */}
          <div className="flex justify-center">
            <span className="bg-muted text-muted-foreground text-xs py-1 px-3 rounded-full">
              Hiển thị tin nhắn từ 3 ngày gần đây
            </span>
          </div>
          
          {/* Messages grouped by date */}
          {Object.entries(groupedMessages).map(([date, messages]) => (
            <div key={date}>
              <div className="flex justify-center my-4">
                <span className="bg-muted text-muted-foreground text-xs py-1 px-3 rounded-full">
                  {date === new Date().toLocaleDateString('vi-VN') ? 'Hôm nay' : date}
                </span>
              </div>
              
              {messages.map((message, index) => (
                <Message 
                  key={message.id} 
                  message={message} 
                  showUser={index === 0 || messages[index - 1]?.userId !== message.userId}
                />
              ))}
            </div>
          ))}
          
          {/* Show when there are no messages */}
          {Object.keys(groupedMessages).length === 0 && (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground text-sm">
                Không có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Chat Input */}
      <div className="p-3 border-t dark:border-gray-700">
        <MessageInput 
          onSend={handleSendMessage}
          placeholder={user ? "Nhập tin nhắn..." : "Nhập /ten [tên của bạn] để đặt tên"}
          disabled={!user}
        />
        <div className="mt-1 text-xs text-muted-foreground px-2">
          Tin nhắn được lưu trong 4 ngày. Gõ @ để tag người dùng.
        </div>
      </div>
    </div>
  );
}
