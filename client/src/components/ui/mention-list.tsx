import React from 'react';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { OnlineUser } from '@/types';

interface MentionListProps {
  users: OnlineUser[];
  onSelect: (username: string) => void;
}

export function MentionList({ users, onSelect }: MentionListProps) {
  if (users.length === 0) return null;
  
  return (
    <div className="absolute z-10 bottom-full left-0 mb-1 w-56 shadow-md rounded-md bg-background border">
      <Command>
        <CommandList>
          <CommandGroup>
            {users.map(user => (
              <CommandItem
                key={user.id}
                onSelect={() => onSelect(user.username)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{user.username}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}