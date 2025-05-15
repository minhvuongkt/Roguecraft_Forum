import React, { useMemo } from 'react';
import { useLocation } from 'wouter';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { OnlineUser, User } from '@/types';

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
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">
          Người dùng online ({onlineUsers.length})
        </h3>
      </div>
      
      <ScrollArea className="h-[280px] pr-3" type="auto">
        <div className="space-y-2">
          {sortedUsers.map((user) => (
            <TooltipProvider key={user.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`flex items-center p-2 rounded-md cursor-pointer
                      ${user.id === currentUser?.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                    onClick={() => navigate(`/user/${user.id}`)}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} alt={user.username} />
                        ) : (
                          <AvatarFallback>
                            {getInitials(user.username)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-white dark:ring-gray-800"></span>
                    </div>
                    <div className="ml-3 overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {user.username}
                        {user.id === currentUser?.id && " (bạn)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Hoạt động {getTimeAgo(user.lastActive)}
                      </p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-xs">
                    <p className="font-bold">{user.username}</p>
                    <p className="text-muted-foreground">
                      Hoạt động {getTimeAgo(user.lastActive)}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          
          {onlineUsers.length === 0 && (
            <div className="text-center p-4 text-muted-foreground text-sm">
              Chưa có người dùng nào online
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}