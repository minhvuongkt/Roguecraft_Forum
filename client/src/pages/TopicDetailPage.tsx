import React, { useState, useEffect, useRef } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useForum } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment as CommentType } from '@/types/index';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, Share, Reply, ArrowLeft, MessageSquare } from 'lucide-react';
import { LoginModal } from '@/components/LoginModal';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { useToast } from '@/hooks/use-toast';

// Comment component for displaying individual comments
const CommentItem = ({ 
  comment, 
  formatDate, 
  onReply,
  depth = 0 
}: { 
  comment: CommentType;
  formatDate: (date: string) => string;
  onReply: (commentId: number) => void;
  depth?: number;
}) => {
  const maxDepth = 3; // Limit nesting depth
  const isReplyable = depth < maxDepth;

  // Fix media if it's stringified JSON or legacy
  let mediaObj: any = comment.media;
  if (mediaObj && typeof mediaObj === 'string') {
    try { mediaObj = JSON.parse(mediaObj); } catch { mediaObj = null; }
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-600 pl-4' : ''}`}>
      <Card className={`mb-3 minecraft-comment ${depth > 0 ? 'border-gray-600' : ''} minecraft-hover-sound`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            {comment.isAnonymous ? (
              <div className="flex items-center">
                <div className="w-8 h-8 minecraft-panel flex items-center justify-center">
                  <span className="minecraft-font text-sm font-bold text-white">?</span>
                </div>
                <div className="ml-2">
                  <div className="minecraft-font text-white">Ẩn danh</div>
                </div>
              </div>
            ) : comment.user ? (
              <div className="flex items-center">
                <Avatar className="h-8 w-8 minecraft-panel">
                  <AvatarImage src={comment.user.avatar || undefined} className="pixelated" />
                  <AvatarFallback className="minecraft-font">{(comment.user.username || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="ml-2">
                  <div className="minecraft-font text-white">{comment.user.username}</div>
                </div>
              </div>
            ) : null}
            
            <span className="minecraft-font text-xs text-green-300">
              {formatDate(typeof comment.createdAt === 'string' ? comment.createdAt : comment.createdAt.toISOString())}
            </span>
          </div>
          
          <div className="minecraft-font text-white" dangerouslySetInnerHTML={{ __html: comment.content }} />
          
          {mediaObj && (
            <>
              {typeof mediaObj === 'object' && !mediaObj.url && Object.keys(mediaObj).some(key => /^\d+$/.test(key))
                ? (
                  <div className={`mt-2 ${Object.keys(mediaObj).length > 1 ? 'grid grid-cols-2 gap-2' : ''}`}>
                    {Object.values(mediaObj).map((path, idx) => {
                      let imagePath = path as string;
                      if (imagePath.startsWith("public/")) imagePath = imagePath.replace(/^public/, '');
                      if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) imagePath = "/" + imagePath;
                      return (
                        <img
                          key={idx}
                          src={imagePath}
                          alt="Comment media"
                          className="border-2 border-gray-600 pixelated max-h-48"
                        />
                      );
                    })}
                  </div>
                )
                : mediaObj.url && mediaObj.type?.startsWith('image/') && (
                  <img
                    src={
                      mediaObj.url.startsWith("public/") ? mediaObj.url.replace(/^public/, '') :
                      (!mediaObj.url.startsWith("http") && !mediaObj.url.startsWith("/")) ? "/" + mediaObj.url :
                      mediaObj.url
                    }
                    alt="Comment media"
                    className="border-2 border-gray-600 pixelated mt-2 max-h-48"
                  />
                )
              }
            </>
          )}

          {isReplyable && (
            <div className="mt-3 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="minecraft-button flex items-center gap-1"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="h-3 w-3" />
                <span className="minecraft-font">Trả lời</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-2">
          {comment.replies.map((reply: CommentType) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              formatDate={formatDate} 
              onReply={onReply}
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function TopicDetailPage() {
  const [, params] = useRoute('/forum/:id');
  const topicId = params ? parseInt(params.id) : null;
  const { fetchTopic, formatDate, toggleLike, createComment, isCreatingComment } = useForum();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const commentFormRef = useRef<HTMLDivElement>(null);
  
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState("");

  const {
    data: topic,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/forum/topics/${topicId}`],
    queryFn: () => fetchTopic(topicId as number),
    enabled: !!topicId,
  });

  const {
    data: comments = [],
    isLoading: isCommentsLoading,
  } = useQuery({
    queryKey: [`/api/forum/topics/${topicId}/comments`],
    queryFn: async () => {
      const response = await fetch(`/api/forum/topics/${topicId}/comments`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json() as Promise<CommentType[]>;
    },
    enabled: !!topicId,
  });

  useEffect(() => {
    // Increment view count when the page is loaded
    if (topicId) {
      fetch(`/api/forum/topics/${topicId}/view`, { 
        method: 'POST' 
      }).catch(err => console.error('Failed to increment view count', err));
    }
  }, [topicId]);

  const handleLike = () => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    toggleLike({ topicId: topicId as number, action: 'like' });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: topic?.title,
        text: `Xem bài viết: ${topic?.title}`,
        url: window.location.href,
      }).catch((error) => {
        console.log('Error sharing', error);
        // Fallback
        copyToClipboard();
      });
    } else {
      // Fallback for browsers that don't support sharing
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({
        title: 'Đã sao chép',
        description: 'Đường dẫn đã được sao chép vào clipboard',
      });
    });
  };

  const handleReplyToComment = (commentId: number) => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    setReplyingTo(commentId);

    const foundComment = comments.find(c => c.id === commentId);
    if (foundComment && foundComment.user && !foundComment.isAnonymous) {
      const mentionText = `@${foundComment.user.username} `;
      if (!comment || !comment.trim().startsWith(mentionText)) {
        setComment(mentionText);
      }
    }

    if (commentFormRef.current) {
      commentFormRef.current.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        const textarea = commentFormRef.current?.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }, 500);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!comment.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập nội dung bình luận',
        variant: 'destructive',
      });
      return;
    }
    createComment({
      topicId: topicId as number,
      content: comment,
      isAnonymous,
      media: null,
      parentCommentId: replyingTo === null ? undefined : replyingTo,
    });
    setComment('');
    setIsAnonymous(false);
    setReplyingTo(null);
  };
  const renderTopicMedia = () => {
    if (!topic?.media) return null;
    let mediaObj: any = topic.media;
    if (typeof mediaObj === "string") {
      try { mediaObj = JSON.parse(mediaObj); } catch { mediaObj = { 0: mediaObj }; }
    }
    if (
      typeof mediaObj === 'object' &&
      !mediaObj.url &&
      Object.keys(mediaObj).some(key => /^\d+$/.test(key))
    ) {
      return (
        <div className={`mb-6 ${Object.keys(mediaObj).length > 1 ? 'grid grid-cols-2 gap-3' : ''}`}>
          {Object.entries(mediaObj).map(([key, path]) => {
            let imagePath = path as string;
            if (imagePath.startsWith("public/")) imagePath = imagePath.replace(/^public/, '');
            if (!imagePath.startsWith("http") && !imagePath.startsWith("/")) imagePath = "/" + imagePath;
            return (
              <div 
                key={key}
                className="minecraft-panel p-2 cursor-pointer pixelated transition-all hover:scale-105 minecraft-hover-sound"
                onClick={() => {
                  setViewingImageUrl(imagePath);
                  setImageViewerOpen(true);
                }}
              >
                <img 
                  src={imagePath}
                  alt={`Topic image ${key}`}
                  className="border-2 border-gray-600 max-h-96 max-w-full pixelated"
                  onError={(e) => {
                    console.error("Failed to load image:", imagePath);
                    const target = e.currentTarget;
                    target.src = "";
                    target.alt = "Image load failed";
                    target.style.height = "96px";
                    target.style.opacity = "0.5";
                  }}
                />
              </div>
            );
          })}
        </div>
      );
    }
    if (mediaObj.url) {
      let mediaUrl = mediaObj.url;
      if (mediaUrl.startsWith("public/")) mediaUrl = mediaUrl.replace(/^public/, '');
      if (!mediaUrl.startsWith("http") && !mediaUrl.startsWith("/")) mediaUrl = "/" + mediaUrl;
      if (mediaObj.type?.startsWith('image/')) {
        return (
          <div 
            className="minecraft-panel p-2 mb-6 cursor-pointer pixelated transition-all hover:scale-105 minecraft-hover-sound"
            onClick={() => {
              setViewingImageUrl(mediaUrl);
              setImageViewerOpen(true);
            }}
          >
            <img 
              src={mediaUrl}
              alt="Topic media"
              className="border-2 border-gray-600 max-h-96 max-w-full pixelated"
              onError={(e) => {
                console.error("Failed to load image:", mediaUrl);
                const target = e.currentTarget;
                target.src = "";
                target.alt = "Image load failed";
                target.style.height = "96px";
                target.style.opacity = "0.5";
              }}
            />
          </div>
        );
      }
    }
    return null;
  };if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 minecraft-dirt">
        <div className="minecraft-panel p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 w-3/4"></div>
            <div className="h-4 bg-gray-700 w-1/4 mt-2"></div>
            <div className="h-48 bg-gray-700 mt-4"></div>
            <div className="h-10 bg-gray-700 mt-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center minecraft-dirt">
        <div className="minecraft-panel p-4">
          <h1 className="minecraft-heading text-2xl text-red-500 mb-4">Error</h1>
          <p className="mb-4 minecraft-font text-white">Không thể tải bài viết. Vui lòng thử lại sau.</p>
          <Link to="/forum">
            <Button variant="outline" className="minecraft-button">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="minecraft-font">Quay lại Forum</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 minecraft-dirt">
      <Link to="/forum">
        <Button variant="ghost" className="minecraft-button mb-6 pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="minecraft-font">Quay lại Forum</span>
        </Button>
      </Link>
      
      <div className="mb-8 minecraft-panel p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="minecraft-item text-xs minecraft-font">
            {topic.category}
          </Badge>
          <span className="minecraft-font text-sm text-green-300">
            {formatDate(topic.createdAt)}
          </span>
        </div>
        
        <h1 className="minecraft-heading text-3xl mb-6">{topic.title}</h1>
        
        <div className="flex items-center mb-6">
          {topic.isAnonymous ? (
            <div className="flex items-center">
              <div className="w-10 h-10 minecraft-panel flex items-center justify-center">
                <span className="minecraft-font text-lg font-bold text-white">?</span>
              </div>
              <div className="ml-3">
                <div className="minecraft-font text-white">Ẩn danh</div>
              </div>
            </div>
          ) : topic.user ? (
            <div className="flex items-center">
              <Avatar className="minecraft-panel">
                <AvatarImage src={topic.user.avatar || undefined} className="pixelated" />
                <AvatarFallback className="minecraft-font">{(topic.user.username || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="minecraft-font text-white">{topic.user.username}</div>
              </div>
            </div>
          ) : null}
        </div>
        
        <div className="prose prose-lg max-w-none mb-6 minecraft-font text-white" dangerouslySetInnerHTML={{ __html: topic.content }} style={{fontSize: "1.2rem"}} />
        
        {renderTopicMedia()}
        
        <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-600">
          <Button 
            variant="outline" 
            size="sm" 
            className="minecraft-button flex items-center gap-2 minecraft-hover-sound"
            onClick={handleLike}
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="minecraft-font">{topic.likeCount}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="minecraft-button flex items-center gap-2 minecraft-hover-sound"
            onClick={handleShare}
          >
            <Share className="h-4 w-4" />
            <span className="minecraft-font">Chia sẻ</span>
          </Button>
        </div>
      </div>
        {/* Comment form */}
      <div className="mb-8 minecraft-panel p-4" ref={commentFormRef}>
        <h2 className="minecraft-heading text-xl mb-4">
          {replyingTo ? 'Trả lời bình luận' : 'Bình luận'}
        </h2>
        
        {replyingTo && (
          <div className="mb-3 p-3 minecraft-comment">
            <div className="flex justify-between items-center">
              <p className="minecraft-font text-green-300">
                Đang trả lời bình luận của {comments.find(c => c.id === replyingTo)?.user?.username || 'người dùng'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="minecraft-button h-6"
              >
                <span className="minecraft-font">Hủy</span>
              </Button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmitComment} className="mb-6">
          <Textarea
            placeholder={replyingTo ? "Viết câu trả lời của bạn..." : "Viết bình luận của bạn..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="minecraft-textarea mb-3 min-h-[100px] w-full"
            disabled={isCreatingComment}
          />
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymousComment"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="minecraft-checkbox mr-2"
                disabled={isCreatingComment}
              />
              <label htmlFor="anonymousComment" className="minecraft-font text-white">Bình luận ẩn danh</label>
            </div>
            
            <Button 
              type="submit" 
              disabled={isCreatingComment}
              className="minecraft-button minecraft-hover-sound"
            >
              <span className="minecraft-font">
                {isCreatingComment ? 'Đang gửi...' : replyingTo ? 'Gửi trả lời' : 'Gửi bình luận'}
              </span>
            </Button>
          </div>
        </form>
      </div>
        {/* Comments list */}
      <div className="minecraft-panel p-4">
        <h3 className="minecraft-heading text-lg mb-4">
          {comments.length} bình luận
        </h3>
        
        {isCommentsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse minecraft-comment p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-gray-700"></div>
                  <div className="h-4 w-32 bg-gray-700"></div>
                </div>
                <div className="h-16 bg-gray-700"></div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 minecraft-comment p-4">
            <p className="minecraft-font text-white">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Only render root comments (no parentCommentId) */}
            {comments
              .filter(comment => !comment.parentCommentId)
              .map(comment => (
                <CommentItem 
                  key={comment.id} 
                  comment={comment} 
                  formatDate={formatDate}
                  onReply={handleReplyToComment}
                />
              ))
            }
          </div>
        )}
      </div>
      
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Image viewer modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={viewingImageUrl}
        title="Hình ảnh đính kèm"
      />
    </div>
  );
}