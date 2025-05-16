import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface ChatSearchProps {
  onSearch: (term: string) => void;
  className?: string;
}

export function ChatSearch({ onSearch, className }: ChatSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Auto focus the input when expanded
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);
  
  const handleSearch = () => {
    onSearch(searchTerm);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      resetSearch();
    }
  };
  
  const resetSearch = () => {
    setSearchTerm('');
    onSearch('');
    setIsExpanded(false);
  };
  
  if (!isExpanded) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-8 w-8 rounded-full ${className}`}
        onClick={() => setIsExpanded(true)}
        title="Tìm kiếm tin nhắn"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }
  
  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="relative w-full">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Tìm tin nhắn..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value === '') {
              onSearch('');
            }
          }}
          onKeyDown={handleKeyDown}
          className="h-8 pr-16 rounded-full bg-gray-100 dark:bg-gray-800 border-none focus-visible:ring-1 focus-visible:ring-blue-500"
        />
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetSearch}
              className="h-6 w-6 p-0"
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSearch}
            className="h-6 w-6 p-0"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="sr-only">Search</span>
          </Button>
        </div>
      </div>
    </div>
  );
}