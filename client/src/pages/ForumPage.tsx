import React from 'react';
import { Forum } from '@/components/Forum';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import "../assets/minecraft-styles.css";

export default function ForumPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col">
        <div className="w-full minecraft-dirt-background p-6 rounded-none border-4 border-t-[#8b8b8b] border-l-[#8b8b8b] border-r-[#3d3d3d] border-b-[#3d3d3d]">
          <Forum />
        </div>
      </div>
      
      {/* Notification prompt */}
      <NotificationPrompt />
    </div>
  );
}