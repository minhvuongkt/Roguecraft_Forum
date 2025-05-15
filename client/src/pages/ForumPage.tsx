import React from 'react';
import { Forum } from '@/components/Forum';
import { NotificationPrompt } from '@/components/NotificationPrompt';

export default function ForumPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col">
        <div className="w-full">
          <Forum />
        </div>
      </div>
      
      {/* Notification prompt */}
      <NotificationPrompt />
    </div>
  );
}