import React, { useState, useEffect, useRef } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useForum, Comment as CommentType } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, Share, Reply, ArrowLeft, MessageSquare } from 'lucide-react';
import { LoginModal } from '@/components/LoginModal';
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
  
  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            {comment.isAnonymous ? (
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-sm font-bold">?</span>
                </div>
                <div className="ml-2">
                  <div className="text-sm font-medium">Ẩn danh</div>
                </div>
              </div>
            ) : comment.user ? (
              <div className="flex items-center">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user.avatar || undefined} />
                  <AvatarFallback>{(comment.user.username || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="ml-2">
                  <div className="text-sm font-medium">{comment.user.username}</div>
                </div>
              </div>
            ) : null}
            
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          
          <div className="text-sm" dangerouslySetInnerHTML={{ __html: comment.content }} />
          
          {comment.media && comment.media.type?.startsWith('image/') && (
            <img 
              src={comment.media.url}
              alt="Comment media"
              className="rounded-lg mt-2 max-h-48"
            />
          )}
          
          {isReplyable && (
            <div className="mt-3 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="h-3 w-3" />
                <span className="text-xs">Trả lời</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Render replies if they exist */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3 mt-2">
          {comment.replies.map(reply => (
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

  // Comments query
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
    
    // Scroll to comment form
    if (commentFormRef.current) {
      commentFormRef.current.scrollIntoView({ behavior: 'smooth' });
      
      // Focus on textarea after scrolling
      setTimeout(() => {
        const textarea = commentFormRef.current?.querySelector('textarea');
        if (textarea) {
          textarea.focus();
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
      parentCommentId: replyingTo,
    });
    
    setComment('');
    setIsAnonymous(false);
    setReplyingTo(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mt-2"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mt-4"></div>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="mb-4">Không thể tải bài viết. Vui lòng thử lại sau.</p>
        <Link to="/forum">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Forum
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/forum">
        <Button variant="ghost" className="mb-6 pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại Forum
        </Button>
      </Link>
      
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {topic.category}
          </Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(topic.createdAt)}
          </span>
        </div>
        
        <h1 className="text-3xl font-bold mb-6">{topic.title}</h1>
        
        <div className="flex items-center mb-6">
          {topic.isAnonymous ? (
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-lg font-bold">?</span>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium">Ẩn danh</div>
              </div>
            </div>
          ) : topic.user ? (
            <div className="flex items-center">
              <Avatar>
                <AvatarImage src={topic.user.avatar || undefined} />
                <AvatarFallback>{(topic.user.username || '?').substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <div className="text-sm font-medium">{topic.user.username}</div>
              </div>
            </div>
          ) : null}
        </div>
        
        <div className="prose prose-lg dark:prose-invert max-w-none mb-6" dangerouslySetInnerHTML={{ __html: topic.content }} />
        
        {topic.media && topic.media.type?.startsWith('image/') && (
          <img 
            src={topic.media.url}
            alt="Topic media"
            className="rounded-lg mb-6 max-h-96 max-w-full"
          />
        )}
        
        <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-800">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleLike}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{topic.likeCount}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={handleShare}
          >
            <Share className="h-4 w-4" />
            <span>Chia sẻ</span>
          </Button>
        </div>
      </div>
      
      {/* Comment form */}
      <div className="mb-8" ref={commentFormRef}>
        <h2 className="text-xl font-bold mb-4">
          {replyingTo ? 'Trả lời bình luận' : 'Bình luận'}
        </h2>
        
        {replyingTo && (
          <div className="mb-3 p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <div className="flex justify-between items-center">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Đang trả lời bình luận của {comments.find(c => c.id === replyingTo)?.user?.username || 'người dùng'}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="h-6 text-xs"
              >
                Hủy
              </Button>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmitComment} className="mb-6">
          <Textarea
            placeholder={replyingTo ? "Viết câu trả lời của bạn..." : "Viết bình luận của bạn..."}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mb-3 min-h-[100px]"
            disabled={isCreatingComment}
          />
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymousComment"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mr-2"
                disabled={isCreatingComment}
              />
              <label htmlFor="anonymousComment" className="text-sm">Bình luận ẩn danh</label>
            </div>
            
            <Button type="submit" disabled={isCreatingComment}>
              {isCreatingComment ? 'Đang gửi...' : replyingTo ? 'Gửi trả lời' : 'Gửi bình luận'}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Comments list */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {comments.length} bình luận
        </h3>
        
        {isCommentsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <p className="text-muted-foreground">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
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
    </div>
  );
}