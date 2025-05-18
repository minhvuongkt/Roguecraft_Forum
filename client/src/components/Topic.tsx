import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Share } from 'lucide-react';
import type { Topic as TopicType } from '@/types/index';
import { useForum } from '@/hooks/useForum';
import "../assets/minecraft-styles.css";

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
        className="text-gray-100 dark:text-gray-200 mb-3 minecraft-text"
        dangerouslySetInnerHTML={{ __html: topic.content }}
      />
    );
  };

  const renderMedia = () => {
    if (!topic.media) return null;

    try {
      let mediaObj: any = topic.media;
      // Handle stringified JSON if needed
      if (typeof mediaObj === "string") {
        try {
          mediaObj = JSON.parse(mediaObj);
        } catch {
          mediaObj = { 0: mediaObj };
        }
      }

      // New format: {"1": "path1", "2": "path2", ...}
      if (
        typeof mediaObj === 'object' &&
        !mediaObj.url &&
        Object.keys(mediaObj).some(key => /^\d+$/.test(key))
      ) {
        const paths = Object.values(mediaObj) as string[];
        if (paths.length === 1) {
          let imagePath = paths[0];
          // Remove "public" if present
          if (imagePath.startsWith("public/")) imagePath = imagePath.replace(/^public/, '');
          // Ensure path starts with / or http
          if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
            imagePath = "/" + imagePath;
          }
          return (
            <img
              src={imagePath}
              alt="Topic attachment"
              className="rounded-none mb-3 w-full max-h-80 object-cover border-2 border-[#555]"
              onError={(e) => {
                console.error("Failed to load image:", imagePath);
                const target = e.currentTarget;
                target.src = "";
                target.alt = "Image load failed";
                target.style.height = "80px";
                target.style.opacity = "0.5";
              }}
            />
          );
        } else {
          // Grid for multiple images
          return (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {paths.map((imgPath, idx) => {
                let imagePath = imgPath;
                if (imagePath.startsWith("public/")) imagePath = imagePath.replace(/^public/, '');
                if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
                  imagePath = "/" + imagePath;
                }
                return (
                  <img
                    key={idx}
                    src={imagePath}
                    alt={`Image ${idx + 1}`}
                    className="rounded-none w-full max-h-60 object-cover border-2 border-[#555]"
                    onError={(e) => {
                      console.error("Failed to load image:", imagePath);
                      const target = e.currentTarget;
                      target.src = "";
                      target.alt = "Image load failed";
                      target.style.height = "60px";
                      target.style.opacity = "0.5";
                    }}
                  />
                );
              })}
            </div>
          );
        }
      }

      // Legacy: simple string
      if (typeof mediaObj === 'string') {
        let imagePath = mediaObj;
        if (imagePath.startsWith("public/")) imagePath = imagePath.replace(/^public/, '');
        if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
          imagePath = "/" + imagePath;
        }
        return (
          <img
            src={imagePath}
            alt="Topic attachment"
            className="rounded-none mb-3 w-full max-h-80 object-cover border-2 border-[#555]"
            onError={(e) => {
              console.error("Failed to load image:", imagePath);
              const target = e.currentTarget;
              target.src = "";
              target.alt = "Image load failed";
              target.style.height = "80px";
              target.style.opacity = "0.5";
            }}
          />
        );
      }

      // Previous format: {url: "path"}
      if (mediaObj?.url) {
        let imagePath = mediaObj.url;
        if (imagePath.startsWith("public/")) imagePath = imagePath.replace(/^public/, '');
        if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) {
          imagePath = "/" + imagePath;
        }
        return (
          <img
            src={imagePath}
            alt="Topic attachment"
            className="rounded-none mb-3 w-full max-h-80 object-cover border-2 border-[#555]"
            onError={(e) => {
              console.error("Failed to load image:", imagePath);
              const target = e.currentTarget;
              target.src = "";
              target.alt = "Image load failed";
              target.style.height = "80px";
              target.style.opacity = "0.5";
            }}
          />
        );
      }
      return null;
    } catch (e) {
      console.error("Error rendering media:", e);
      return null;
    }
  };

  return (
    <div 
      className="minecraft-topic cursor-pointer" 
      onClick={onClick}
    >
      <div className="flex items-center mb-2">
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage
            src={
              topic.user?.avatar ||
              `https://api.dicebear.com/7.x/adventurer/svg?seed=${topic.user?.id}&backgroundColor=b6e3f4`
            }
            alt={topic.user?.username || "Anonymous"}
          />
          <AvatarFallback>
            {topic.user?.username?.charAt(0).toUpperCase() || "A"}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-['VT323'] text-lg text-[#ffff55]">{topic.title}</div>
          <div className="text-xs text-gray-300 flex items-center gap-1">
            <span className="font-['VT323']">
              {topic.user?.username || "Anonymous"} • {formatDate(topic.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Content preview */}
      {renderContent()}

      {/* Media if available */}
      {renderMedia()}

      {/* Actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-2">
          <Button
            variant="minecraft"
            size="sm"
            className="gap-1 py-0 px-2 h-7"
            onClick={handleLikeClick}
          >
            <ThumbsUp className="h-3 w-3" />
            <span className="font-['VT323'] text-sm">{topic.likeCount || 0}</span>
          </Button>
          <Button
            variant="minecraft"
            size="sm"
            className="gap-1 py-0 px-2 h-7"
            onClick={onClick}
          >
            <MessageSquare className="h-3 w-3" />
            <span className="font-['VT323'] text-sm">{topic.commentCount || 0}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Topic = memo(TopicComponent);