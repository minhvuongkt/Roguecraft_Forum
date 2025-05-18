import React, { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { OnlineUser } from '@/types';
import type { User } from '@/types/index';
import { Users } from 'lucide-react';

interface OnlineUsersProps {
  currentUser: User | null;
}

export function OnlineUsers({ currentUser }: OnlineUsersProps) {
  const { onlineUsers } = useWebSocket();
  const [, navigate] = useLocation();
  
  // Sort users: current user first, then alphabetically by username
  const sortedUsers = useMemo(() => {
    return [...onlineUsers].sort((a, b) => {
      // Current user always comes first
      if (a.id === currentUser?.id) return -1;
      if (b.id === currentUser?.id) return 1;
      
      // Then sort alphabetically
      return a.username.localeCompare(b.username);
    });
  }, [onlineUsers, currentUser]);
  
  // Get initials from username for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Format the time a user has been active
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'bây giờ';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };
  
  if (sortedUsers.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Chưa có bé nào</h3>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-6 text-center border border-gray-100 dark:border-gray-800">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Users className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kéo các đồng râm vào nói chuyện đê
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Mem còn thở ({sortedUsers.length})</h3>
      </div>
      
      <ScrollArea className="h-[calc(100vh-350px)] pr-3">
        {sortedUsers.map(user => (
          <TooltipProvider key={user.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`flex items-center py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 group 
                    hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-1 px-2 rounded-lg transition-colors cursor-pointer
                    ${user.id === currentUser?.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  // onClick={() => navigate(`/user/${user.id}`)}
                >
                  <div className="relative mr-3 flex-shrink-0">
                    <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-900 shadow-sm">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.username} />
                      ) : (
                        <AvatarFallback className={`${
                          user.id === currentUser?.id 
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        } text-sm`}>
                          {getInitials(user.username)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900"></span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-medium text-sm truncate text-gray-800 dark:text-gray-200">
                        {user.username}
                        {user.id === currentUser?.id && 
                          <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(bạn)</span>
                        }
                      </p>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                        {getTimeAgo(new Date(user.lastActive))}
                      </span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                      Đang thở
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="p-2 text-xs">
                <div className="flex flex-col">
                  <p className="font-semibold">{user.username}</p>
                  <p className="text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                    Online từ {getTimeAgo(new Date(user.lastActive))}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </ScrollArea>
    </div>
  );
}