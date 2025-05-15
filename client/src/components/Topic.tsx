import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Share } from 'lucide-react';
import { Topic as TopicType } from '@/hooks/useForum';
import { useForum } from '@/hooks/useForum';

interface TopicProps {
  topic: TopicType;
  onClick?: () => void;
}

function TopicComponent({ topic, onClick }: TopicProps) {
  const { formatDate, toggleLike } = useForum();
  
  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike({ topicId: topic.id, action: 'like' });
  };
  
  const renderContent = () => {
    return (
      <div
        className="text-gray-700 dark:text-gray-300 mb-3"
        dangerouslySetInnerHTML={{ __html: topic.content }}
      />
    );
  };
  
  const renderMedia = () => {
    if (!topic.media) return null;
    
    try {
      // Kiểm tra định dạng mới: {"1": "path1", "2": "path2", ...}
      if (typeof topic.media === 'object' && !topic.media.url && Object.keys(topic.media).some(key => /^\d+$/.test(key))) {
        // Định dạng mới - object với khóa số
        if (Object.keys(topic.media).length === 1) {
          // Chỉ một hình ảnh - hiển thị lớn hơn
          const path = topic.media['1'];
          return (
            <img
              src={path as string}
              alt="Topic attachment"
              className="rounded-lg mb-3 w-full max-h-80 object-cover"
            />
          );
        } else {
          // Nhiều hình ảnh - hiển thị dạng lưới
          return (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.entries(topic.media).map(([key, value]) => (
                <img
                  key={key}
                  src={value as string}
                  alt={`Image ${key}`}
                  className="rounded-lg w-full max-h-60 object-cover"
                />
              ))}
            </div>
          );
        }
      }
      
      // Định dạng cũ
      if (topic.media.type?.startsWith('image/')) {
        return (
          <img
            src={topic.media.url}
            alt="Topic attachment"
            className="rounded-lg mb-3 w-full max-h-80 object-cover"
          />
        );
      }
      
      if (topic.media.type?.startsWith('video/')) {
        return (
          <video
            src={topic.media.url}
            controls
            className="rounded-lg mb-3 w-full max-h-80"
          />
        );
      }
    } catch (err) {
      console.error("Error rendering topic media:", err);
    }
    
    return null;
  };
  
  return (
    <Card className="hover:shadow-md transition cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {topic.isAnonymous ? (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          ) : (
            <Avatar className="w-10 h-10">
              {topic.user?.avatar ? (
                <AvatarImage src={topic.user.avatar} alt={topic.user.username} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {topic.user?.username.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
          )}
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <h3 className="font-medium">
                  {topic.isAnonymous ? 'Ẩn danh' : topic.user?.username}
                </h3>
                {!topic.isAnonymous && (
                  <Badge variant="outline" className="ml-2 px-2 py-0">
                    Online
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDate(topic.createdAt)}
              </span>
            </div>
            
            <h2 className="text-lg font-semibold mb-2">{topic.title}</h2>
            
            {renderContent()}
            {renderMedia()}
            
            <div className="flex items-center text-sm text-muted-foreground space-x-4">
              <Button variant="ghost" size="sm" className="space-x-1 h-8">
                <MessageSquare className="h-4 w-4" />
                <span>{topic.commentCount || 0} bình luận</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="space-x-1 h-8" 
                onClick={handleLikeClick}
              >
                <ThumbsUp className="h-4 w-4" />
                <span>{topic.likeCount}</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="space-x-1 h-8">
                <Share className="h-4 w-4" />
                <span>Chia sẻ</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const Topic = memo(TopicComponent);
