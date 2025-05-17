import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  username?: string;
  className?: string;
}

export function TypingIndicator({ username, className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex items-center py-1 px-2 text-sm text-gray-400", className)}>
      <div className="flex mr-2">
        <span className="w-2 h-2 bg-gray-300 rounded-full mr-1 animate-pulse" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 bg-gray-300 rounded-full mr-1 animate-pulse" style={{ animationDelay: '200ms' }}></span>
        <span className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
      </div>
      
      {username && (
        <span className="italic minecraft-font">
          {username} đang nhập...
        </span>
      )}
    </div>
  );
}