import React from 'react';
import { ChatBox } from '@/components/ChatBox';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { OnlineUsers } from '@/components/OnlineUsers';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatPage() {
  const { user } = useAuth();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-4">Chat trong cộng đồng</h1>
      
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main chat box */}
        <div className="w-full lg:w-3/4">
          <ChatBox />
        </div>
        
        {/* Online users sidebar */}
        <div className="w-full lg:w-1/4 mt-4 lg:mt-0">
          <OnlineUsers currentUser={user} />
        </div>
      </div>
      
      {/* Notification prompt */}
      <NotificationPrompt />
    </div>
  );
}