import { useState, useEffect, useMemo, useCallback } from 'react';
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
  parentCommentId?: number | null;
  replies?: Comment[];
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
      parentCommentId,
    }: {
      topicId: number;
      content: string;
      isAnonymous: boolean;
      media?: any;
      parentCommentId?: number;
    }) => {
      if (!user) {
        throw new Error('You must be logged in to comment');
      }
      
      const response = await apiRequest('POST', `/api/forum/topics/${topicId}/comments`, {
        userId: user.id,
        content,
        isAnonymous,
        media,
        parentCommentId,
      });
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate topic query to refetch the comments
      queryClient.invalidateQueries({ queryKey: [`/api/forum/topics/${variables.topicId}`] });
      
      // The response now includes both the new comment and all updated comments
      // We can update the comments in the cache directly
      if (data.allComments) {
        queryClient.setQueryData([`/api/forum/topics/${variables.topicId}/comments`], data.allComments);
      }
      
      toast({
        title: 'Thành công',
        description: parentCommentId ? 'Đã thêm câu trả lời' : 'Đã thêm bình luận',
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

  // Toggle topic like mutation with optimistic updates
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ topicId, action }: { topicId: number; action: 'like' | 'unlike' }) => {
      if (!user) {
        throw new Error('You must be logged in to like a topic');
      }
      
      const response = await apiRequest('POST', `/api/forum/topics/${topicId}/like`, {
        action,
        userId: user.id,
      });
      
      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/forum/topics'] });
      await queryClient.cancelQueries({ queryKey: [`/api/forum/topics/${variables.topicId}`] });
      
      // Snapshot the previous value
      const previousTopics = queryClient.getQueryData<Topic[]>(['/api/forum/topics']);
      const previousTopic = queryClient.getQueryData<Topic>([`/api/forum/topics/${variables.topicId}`]);
      
      // Optimistically update to the new value
      if (previousTopics) {
        queryClient.setQueryData<Topic[]>(['/api/forum/topics'], old => 
          (old || []).map(topic => {
            if (topic.id === variables.topicId) {
              return {
                ...topic,
                likeCount: variables.action === 'like' ? topic.likeCount + 1 : Math.max(0, topic.likeCount - 1)
              };
            }
            return topic;
          })
        );
      }
      
      if (previousTopic) {
        queryClient.setQueryData<Topic>([`/api/forum/topics/${variables.topicId}`], old => {
          if (!old) return old;
          return {
            ...old,
            likeCount: variables.action === 'like' ? old.likeCount + 1 : Math.max(0, old.likeCount - 1)
          };
        });
      }
      
      // Return a context object with the snapshotted value
      return { previousTopics, previousTopic };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTopics) {
        queryClient.setQueryData(['/api/forum/topics'], context.previousTopics);
      }
      if (context?.previousTopic) {
        queryClient.setQueryData([`/api/forum/topics/${variables.topicId}`], context.previousTopic);
      }
      
      toast({
        title: 'Lỗi',
        description: (error as Error).message || 'Không thể thực hiện. Vui lòng thử lại sau.',
        variant: 'destructive',
      });
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['/api/forum/topics'] });
      queryClient.invalidateQueries({ queryKey: [`/api/forum/topics/${variables.topicId}`] });
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

  // Helper function to format date for display (memoized)
  const formatDate = useCallback((dateString: string) => {
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
  }, []);
  
  // Memoized selectors for filtered topics
  const popularTopics = useMemo(() => {
    return [...topics].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);
  }, [topics]);
  
  // Memoized selector for topics by category
  const topicsByCategory = useMemo(() => {
    if (selectedCategory === 'Tất cả') return topics;
    return topics.filter(topic => topic.category === selectedCategory);
  }, [topics, selectedCategory]);

  return {
    topics,
    topicsByCategory,
    popularTopics,
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
