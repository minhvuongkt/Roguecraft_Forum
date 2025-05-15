import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Topic {
  id: number;
  title: string;
  content: string;
  media: any;
  category: string;
  isAnonymous: boolean;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  user: {
    id: number;
    username: string;
    avatar: string | null;
  } | null;
}

export interface Comment {
  id: number;
  topicId: number;
  content: string;
  media: any;
  createdAt: string;
  isAnonymous: boolean;
  user: {
    id: number;
    username: string;
    avatar: string | null;
  } | null;
}

export function useForum() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [page, setPage] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const limit = 10;

  // Fetch topics based on category and pagination
  const {
    data: topics = [],
    isLoading: isTopicsLoading,
    error: topicsError,
    refetch: refetchTopics,
  } = useQuery({
    queryKey: ['/api/forum/topics', selectedCategory, page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      const categoryParam = selectedCategory !== 'Tất cả' ? `&category=${selectedCategory}` : '';
      const response = await fetch(`/api/forum/topics?limit=${limit}&offset=${offset}${categoryParam}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      
      const data = await response.json();
      return data as Topic[];
    },
  });

  // Create new topic mutation
  const createTopicMutation = useMutation({
    mutationFn: async (topicData: {
      title: string;
      content: string;
      category: string;
      isAnonymous: boolean;
      media?: any;
    }) => {
      if (!user) {
        throw new Error('You must be logged in to create a topic');
      }
      
      const response = await apiRequest('POST', '/api/forum/topics', {
        ...topicData,
        userId: user.id,
      });
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate topics query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['/api/forum/topics'] });
      toast({
        title: 'Thành công',
        description: 'Đã tạo topic mới',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: (error as Error).message || 'Không thể tạo topic. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async ({
      topicId,
      content,
      isAnonymous,
      media,
    }: {
      topicId: number;
      content: string;
      isAnonymous: boolean;
      media?: any;
    }) => {
      if (!user) {
        throw new Error('You must be logged in to comment');
      }
      
      const response = await apiRequest('POST', `/api/forum/topics/${topicId}/comments`, {
        userId: user.id,
        content,
        isAnonymous,
        media,
      });
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate topic query to refetch the comments
      queryClient.invalidateQueries({ queryKey: [`/api/forum/topics/${variables.topicId}`] });
      toast({
        title: 'Thành công',
        description: 'Đã thêm bình luận',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: (error as Error).message || 'Không thể thêm bình luận. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    },
  });

  // Toggle topic like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ topicId, action }: { topicId: number; action: 'like' | 'unlike' }) => {
      if (!user) {
        throw new Error('You must be logged in to like a topic');
      }
      
      const response = await apiRequest('POST', `/api/forum/topics/${topicId}/like`, {
        action,
      });
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate topic queries to update like count
      queryClient.invalidateQueries({ queryKey: ['/api/forum/topics'] });
      queryClient.invalidateQueries({ queryKey: [`/api/forum/topics/${variables.topicId}`] });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: (error as Error).message || 'Không thể thực hiện. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    },
  });

  // Function to fetch a specific topic
  const fetchTopic = async (topicId: number) => {
    const response = await fetch(`/api/forum/topics/${topicId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch topic');
    }
    
    return response.json();
  };

  // Helper function to format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than a minute
    if (diff < 60 * 1000) {
      return 'Vừa xong';
    }
    
    // Less than an hour
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `${minutes} phút trước`;
    }
    
    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours} giờ trước`;
    }
    
    // Less than a week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days} ngày trước`;
    }
    
    // Format as date
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  return {
    topics,
    isTopicsLoading,
    topicsError,
    selectedCategory,
    setSelectedCategory,
    page,
    setPage,
    createTopic: createTopicMutation.mutate,
    isCreatingTopic: createTopicMutation.isPending,
    createComment: createCommentMutation.mutate,
    isCreatingComment: createCommentMutation.isPending,
    toggleLike: toggleLikeMutation.mutate,
    isTogglingLike: toggleLikeMutation.isPending,
    fetchTopic,
    formatDate,
    refetchTopics,
  };
}
