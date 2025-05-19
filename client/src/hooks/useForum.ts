import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { toVNTime, timeFromNow, formatDateTime } from '@/lib/dayjs';
// Use the correct import for Topic and Comment types
import type { Topic, Comment } from '@/types/index';

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
        throw new Error('Bạn phải đăng nhập để tạo topic');
      }
      console.log('Preparing topic data for API request');
      
      try {
        if (!user || !user.id) {
          throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        }
        
        // Chuẩn bị data với xác thực cẩn thận
        const validatedTopicData: {
          userId: number;
          title: string;
          content: string;
          category: string;
          isAnonymous: boolean;
          media: Record<string, string> | null;
        } = {
          userId: Number(user.id),
          title: String(topicData.title || "").trim(),
          content: String(topicData.content || "").trim(),
          category: String(topicData.category || 'Tất cả'),
          isAnonymous: Boolean(topicData.isAnonymous),
          media: null // Mặc định là null
        };
        
        // Kiểm tra dữ liệu hợp lệ
        if (!validatedTopicData.title) {
          throw new Error('Tiêu đề không được để trống');
        }
        
        if (validatedTopicData.title.length > 255) {
          throw new Error('Tiêu đề không được quá 255 ký tự');
        }
        
        if (!validatedTopicData.content) {
          throw new Error('Nội dung không được để trống');
        }
        
        if (validatedTopicData.content.length > 10000) {
          throw new Error('Nội dung không được quá 10000 ký tự');
        }
        
        // Xử lý media một cách cẩn thận
        if (topicData.media) {
          try {
            if (typeof topicData.media === 'object' && topicData.media !== null) {
              const safeMedia: Record<string, string> = {};
              
              Object.entries(topicData.media).forEach(([key, value]) => {
                if (typeof value === 'string') {
                  safeMedia[key] = value;
                } else if (value !== null && value !== undefined) {
                  safeMedia[key] = String(value);
                }
              });
              
              if (Object.keys(safeMedia).length > 0) {
                validatedTopicData.media = safeMedia;
                console.log('Media processed successfully:', Object.keys(safeMedia).length, 'items');
              }
            }
          } catch (mediaError) {
            console.error('Error processing media:', mediaError);
            // Giữ media là null nếu có lỗi
          }
        }
        
        console.log('Sending request with data:', {
          ...validatedTopicData,
          content: validatedTopicData.content.substring(0, 30) + '...'
        });
        
        try {
          const response = await apiRequest('POST', '/api/forum/topics', validatedTopicData);
          
          if (!response.ok) {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            
            try {
              const contentType = response.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const errorJson = await response.json();
                errorMessage = errorJson.message || errorJson.details || errorMessage;
              } else {
                const errorText = await response.text();
                if (errorText) errorMessage = errorText;
              }
            } catch (parseError) {
              console.error('Error parsing error response:', parseError);
            }
            
            throw new Error(errorMessage);
          }
          
          console.log('Topic created successfully:', response.status);
          return response.json();
        } catch (networkError) {
          console.error('Network error in topic creation:', networkError);
          throw new Error(`Lỗi kết nối: ${networkError instanceof Error ? networkError.message : 'Không thể kết nối tới máy chủ'}`);
        }
      } catch (error) {
        console.error('Error in create topic mutation:', error);
        throw error instanceof Error ? error : new Error('Lỗi không xác định khi tạo topic');
      }
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
        description: variables.parentCommentId ? 'Đã thêm câu trả lời' : 'Đã thêm bình luận',
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

  // Format date based on how recent it is
  const formatDate = useCallback((dateInput: string | number | Date) => {
    return formatDateTime(dateInput, 'DD/MM/YYYY HH:mm:ss');
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
