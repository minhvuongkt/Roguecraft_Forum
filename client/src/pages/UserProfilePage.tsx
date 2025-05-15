import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LoginModal } from '@/components/LoginModal';
import { CalendarDays, MessageSquare, FileText, User } from 'lucide-react';

interface UserProfile {
  user: {
    id: number;
    username: string;
    avatar: string | null;
    isTemporary: boolean;
    createdAt: string;
    lastActive: string;
  };
  topics: {
    id: number;
    title: string;
    category: string;
    createdAt: string;
    viewCount: number;
    likeCount: number;
  }[];
  stats: {
    messageCount: number;
    topicCount: number;
  };
}

function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  const { data, isLoading, error } = useQuery<UserProfile>({
    queryKey: ['/api/users', id],
    enabled: !!id
  });
  
  const isOwnProfile = currentUser?.id === parseInt(id);
  
  // Handle not logged in users trying to view profiles
  React.useEffect(() => {
    if (!isAuthenticated && !isLoading && !error) {
      setIsLoginModalOpen(true);
    }
  }, [isAuthenticated, isLoading, error]);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3">
            <Card>
              <CardHeader className="space-y-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="w-full md:w-2/3">
            <Skeleton className="h-10 w-48 mb-6" />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Handle error state
  if (error || !data) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Error Loading Profile</AlertTitle>
          <AlertDescription>
            This user profile couldn't be loaded. The user may not exist or there was a server error.
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/forum')}
            >
              Return to Forum
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const { user, topics, stats } = data;
  
  return (
    <>
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row gap-8">
          {/* User info section */}
          <div className="w-full md:w-1/3">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-4">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.username} />
                    ) : (
                      <AvatarFallback className="text-xl">
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <CardTitle className="mb-1">{user.username}</CardTitle>
                  {user.isTemporary ? (
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      Temporary User
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Registered User
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mt-4">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
                    <span className="text-sm text-muted-foreground">
                      Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4 opacity-70" />
                    <span className="text-sm text-muted-foreground">
                      {stats.topicCount} {stats.topicCount === 1 ? 'Topic' : 'Topics'}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4 opacity-70" />
                    <span className="text-sm text-muted-foreground">
                      {stats.messageCount} {stats.messageCount === 1 ? 'Message' : 'Messages'}
                    </span>
                  </div>
                </div>
                
                {isOwnProfile && (
                  <div className="mt-6">
                    <Button className="w-full" size="sm">
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* User activity section */}
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="topics">
              <TabsList className="mb-6">
                <TabsTrigger value="topics">Topics</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>
              
              <TabsContent value="topics">
                <h2 className="text-xl font-semibold mb-4">Recent Topics</h2>
                {topics.length === 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-center text-muted-foreground">
                        {isOwnProfile ? "You haven't" : "This user hasn't"} created any topics yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {topics.map((topic) => (
                      <Card key={topic.id} className="cursor-pointer hover:border-primary/50 transition-all" 
                        onClick={() => navigate(`/forum/${topic.id}`)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{topic.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {topic.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(topic.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <div>{topic.viewCount} views</div>
                              <div>{topic.likeCount} likes</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="about">
                <Card>
                  <CardHeader>
                    <CardTitle>About {user.username}</CardTitle>
                    <CardDescription>
                      User information and profile details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-1">Account Type</h3>
                        <p>{user.isTemporary ? 'Temporary User' : 'Registered User'}</p>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="font-medium mb-1">Last Active</h3>
                        <p>{formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}</p>
                      </div>
                      {!user.isTemporary && (
                        <>
                          <Separator />
                          <div>
                            <h3 className="font-medium mb-1">Member Since</h3>
                            <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </>
  );
}

export default UserProfilePage;