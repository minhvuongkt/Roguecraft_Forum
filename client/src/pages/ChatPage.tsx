import React from 'react';
import { ChatBox } from '@/components/ChatBox';
import { NotificationPrompt } from '@/components/NotificationPrompt';

export default function ChatPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col">
        <div className="w-full">
          <h1 className="text-2xl font-bold mb-4">Chat trong cộng đồng</h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <ChatBox />
          </div>
        </div>
      </div>
      
      {/* Notification prompt */}
      <NotificationPrompt />
    </div>
  );
}