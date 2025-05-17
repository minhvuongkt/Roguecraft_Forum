import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PaintBucket } from 'lucide-react';

interface MessageColorPickerProps {
  onColorSelect: (color: string) => void;
}

// Các màu nền cho tin nhắn theo phong cách gaming
const COLORS = [
  { name: 'Discord Purple', value: 'bg-purple-600' },
  { name: 'Minecraft Green', value: 'bg-green-600' },
  { name: 'Roblox Red', value: 'bg-red-600' },
  { name: 'Fortnite Blue', value: 'bg-blue-600' },
  { name: 'Cyberpunk Yellow', value: 'bg-yellow-500' },
  { name: 'Gaming Pink', value: 'bg-pink-500' },
  { name: 'Retro Orange', value: 'bg-orange-500' },
  { name: 'Tech Cyan', value: 'bg-cyan-500' },
];

export function MessageColorPicker({ onColorSelect }: MessageColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              onClick={() => setIsOpen(!isOpen)}
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <PaintBucket className="h-4 w-4" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Thay đổi màu tin nhắn</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className="absolute bottom-full right-0 mb-2 p-2 bg-gray-800 rounded-lg shadow-lg z-10 grid grid-cols-4 gap-1"
        >
          {COLORS.map((color) => (
            <TooltipProvider key={color.value}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      onColorSelect(color.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-6 h-6 rounded-full",
                      color.value
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{color.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </motion.div>
      )}
    </div>
  );
}