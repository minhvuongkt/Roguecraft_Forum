import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  username: string;
  avatar?: string | null;
}

export function TypingIndicator({ username, avatar }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Avatar className="h-7 w-7 flex-shrink-0">
        {avatar ? (
          <AvatarImage src={avatar} alt={username} />
        ) : (
          <AvatarFallback className="text-xs bg-purple-600 text-white">
            {username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        )}
      </Avatar>
      
      <div className="bg-gray-700 rounded-xl p-3 text-sm min-w-[80px]">
        <div className="flex gap-1 items-center">
          <motion.div
            className="w-2 h-2 rounded-full bg-purple-400"
            animate={{
              y: [0, -5, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0
            }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-purple-400"
            animate={{
              y: [0, -5, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.2
            }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-purple-400"
            animate={{
              y: [0, -5, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.4
            }}
          />
        </div>
      </div>
    </div>
  );
}