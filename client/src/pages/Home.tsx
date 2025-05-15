import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Forum } from '@/components/Forum';
import { ChatBox } from '@/components/ChatBox';
import { NotificationPrompt } from '@/components/NotificationPrompt';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'forum' | 'chat'>('forum');
  const [location] = useLocation();

  useEffect(() => {
    // Set active tab based on URL hash
    if (location.includes('#chat')) {
      setActiveTab('chat');
    } else {
      setActiveTab('forum');
    }
  }, [location]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:space-x-6">
        {/* Forum Section - shown when activeTab is 'forum' on mobile */}
        <div 
          id="forum" 
          className={`md:w-2/3 ${activeTab === 'forum' ? 'block' : 'hidden md:block'}`}
        >
          <Forum />
        </div>
        
        {/* Chat Section - shown when activeTab is 'chat' on mobile */}
        <div 
          id="chat" 
          className={`md:w-1/3 mt-8 md:mt-0 ${activeTab === 'chat' ? 'block' : 'hidden md:block'}`}
        >
          <ChatBox />
        </div>
      </div>
      
      {/* Notification prompt */}
      <NotificationPrompt />
    </div>
  );
}
