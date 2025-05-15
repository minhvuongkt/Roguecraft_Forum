import React, { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smile, Clock, Heart, Flag, Coffee, Ghost } from 'lucide-react';

// Common emoji categories
const emojis = {
  recent: ['😊', '👍', '❤️', '😂', '🎉', '🔥', '👏', '🙏'],
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
  people: ['👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '👨‍🦱', '👩‍🦰', '👨‍🦰', '👱‍♀️', '👱‍♂️'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍'],
  objects: ['⌚️', '📱', '💻', '⌨️', '🖥', '🖱', '🖨', '🖼', '🗑', '🔑', '🔒', '🔨', '🪓', '🔧'],
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(emojis.recent);
  
  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent_emojis');
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent emojis:', e);
      }
    }
  }, []);
  
  // Add emoji to recent list when selected
  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
    
    // Update recent emojis
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
    setRecentEmojis(updated);
    localStorage.setItem('recent_emojis', JSON.stringify(updated));
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <Tabs defaultValue="recent">
          <TabsList className="grid grid-cols-6 h-10">
            <TabsTrigger value="recent">
              <Clock className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="smileys">
              <Smile className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="people">
              <Heart className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="animals">
              <Flag className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="food">
              <Coffee className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="objects">
              <Ghost className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
          
          <div className="h-48 overflow-y-auto p-2">
            <TabsContent value="recent" className="flex flex-wrap m-0 mt-0">
              {recentEmojis.map((emoji, i) => (
                <button 
                  key={i} 
                  className="p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </TabsContent>
            
            <TabsContent value="smileys" className="flex flex-wrap m-0 mt-0">
              {emojis.smileys.map((emoji, i) => (
                <button 
                  key={i} 
                  className="p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </TabsContent>
            
            <TabsContent value="people" className="flex flex-wrap m-0 mt-0">
              {emojis.people.map((emoji, i) => (
                <button 
                  key={i} 
                  className="p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </TabsContent>
            
            <TabsContent value="animals" className="flex flex-wrap m-0 mt-0">
              {emojis.animals.map((emoji, i) => (
                <button 
                  key={i} 
                  className="p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </TabsContent>
            
            <TabsContent value="food" className="flex flex-wrap m-0 mt-0">
              {emojis.food.map((emoji, i) => (
                <button 
                  key={i} 
                  className="p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </TabsContent>
            
            <TabsContent value="objects" className="flex flex-wrap m-0 mt-0">
              {emojis.objects.map((emoji, i) => (
                <button 
                  key={i} 
                  className="p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  onClick={() => handleSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
