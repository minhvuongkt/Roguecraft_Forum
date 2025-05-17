import React from 'react';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, AtSign } from 'lucide-react';
import { OnlineUser } from '@/types';

interface MentionListProps {
  users: OnlineUser[];
  onSelect: (username: string) => void;
}

export function MentionList({ users, onSelect }: MentionListProps) {
  if (users.length === 0) return null;
  
  return (
    <div className="absolute z-50 bottom-full left-0 mb-1 w-[280px] shadow-lg rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center">
        <AtSign className="h-3 w-3 mr-1.5" />
        Gợi ý người dùng ({users.length})
      </div>
      <Command className="border-none shadow-none rounded-none">
        <CommandList className="max-h-[180px] overflow-y-auto thin-scrollbar">
          <CommandGroup>
            {users.map(user => (
              <CommandItem
                key={user.id}
                onSelect={() => onSelect(user.username)}
                className="flex items-center gap-2 cursor-pointer px-3 py-2 aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-300">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{user.username}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Hoạt động gần đây</span>
                  </div>
                </div>
                <span className="text-xs text-blue-500 rounded-full px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 font-medium">@</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}