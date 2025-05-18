import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Share } from 'lucide-react';
import type { Topic as TopicType } from '@/types/index';
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
              className="rounded-lg mb-3 w-full max-h-80 object-cover"
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
                    className="rounded-lg w-full max-h-60 object-cover"
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

      // Old format: { url, type, name... }
      if (mediaObj.url) {
        let mediaUrl = mediaObj.url;
        if (mediaUrl.startsWith("public/")) mediaUrl = mediaUrl.replace(/^public/, '');
        if (!mediaUrl.startsWith("http") && !mediaUrl.startsWith("/")) {
          mediaUrl = "/" + mediaUrl;
        }

        if (mediaObj.type?.startsWith('image/')) {
          return (
            <img
              src={mediaUrl}
              alt="Topic attachment"
              className="rounded-lg mb-3 w-full max-h-80 object-cover"
              onError={(e) => {
                console.error("Failed to load image:", mediaUrl);
                const target = e.currentTarget;
                target.src = "";
                target.alt = "Image load failed";
                target.style.height = "80px";
                target.style.opacity = "0.5";
              }}
            />
          );
        }
        if (mediaObj.type?.startsWith('video/')) {
          return (
            <video
              src={mediaUrl}
              controls
              className="rounded-lg mb-3 w-full max-h-80"
            />
          );
        }
      }
    } catch (err) {
      console.error("Error rendering topic media:", err, topic.media);
    }

    return null;
  };

  return (
    <Card className="hover:shadow-md transition cursor-pointer minecraft-panel border-2 border-gray-600" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {topic.isAnonymous ? (
            <div className="w-10 h-10 minecraft-button flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-gray-300"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          ) : (
            <div className="w-10 h-10 minecraft-button flex items-center justify-center overflow-hidden">
              {topic.user?.avatar ? (
                <img src={topic.user.avatar} alt={topic.user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-sm">
                  {topic.user?.username?.substring(0, 2).toUpperCase() || 'U'}
                </span>
              )}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <h3 className="font-medium minecraft-font text-white">
                  {topic.isAnonymous ? 'Ẩn danh' : topic.user?.username}
                </h3>
                {!topic.isAnonymous && (
                  <Badge variant="outline" className="ml-2 px-2 py-0 border-green-500 text-green-400">
                    Online
                  </Badge>
                )}
              </div>
              <span className="text-xs text-gray-400 minecraft-font">
                {formatDate(topic.createdAt)}
              </span>
            </div>

            <h2 className="text-lg font-semibold mb-2 minecraft-font text-yellow-300">{topic.title}</h2>

            <div className="text-gray-300 mb-3 minecraft-font" dangerouslySetInnerHTML={{ __html: topic.content }} />
            {renderMedia()}

            <div className="flex items-center text-sm text-gray-400 space-x-4 mt-2 pt-2 border-t border-gray-700">
              <Button variant="ghost" size="sm" className="space-x-1 h-8 minecraft-button">
                <MessageSquare className="h-4 w-4" />
                <span className="minecraft-font">{topic.commentCount || 0}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="space-x-1 h-8 minecraft-button"
                onClick={handleLikeClick}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="minecraft-font">{topic.likeCount}</span>
              </Button>

              <Button variant="ghost" size="sm" className="space-x-1 h-8 minecraft-button">
                <Share className="h-4 w-4" />
                <span className="minecraft-font">Chia sẻ</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const Topic = memo(TopicComponent);