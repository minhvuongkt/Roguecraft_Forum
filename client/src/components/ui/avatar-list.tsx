import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface User {
  id: number;
  username: string;
  avatar: string | null;
}

interface AvatarListProps {
  users: User[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvatarList({ users, max = 3, size = 'md' }: AvatarListProps) {
  const visibleUsers = users.slice(0, max);
  const hiddenCount = users.length - max;
  
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };
  
  const offsetClasses = {
    sm: '-ml-1.5',
    md: '-ml-2',
    lg: '-ml-2.5'
  };
  
  return (
    <div className="flex">
      {visibleUsers.map((user, index) => (
        <Avatar 
          key={user.id} 
          className={`${sizeClasses[size]} ${index > 0 ? offsetClasses[size] : ''} ring-2 ring-background`}
        >
          {user.avatar ? (
            <AvatarImage src={user.avatar} alt={user.username} />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
      ))}
      
      {hiddenCount > 0 && (
        <div 
          className={`${sizeClasses[size]} ${offsetClasses[size]} rounded-full bg-muted text-muted-foreground flex items-center justify-center ring-2 ring-background`}
        >
          +{hiddenCount}
        </div>
      )}
    </div>
  );
}
