import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  avatar: string | null;
  isTemporary: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setTemporaryUser: (username: string) => Promise<void>;
  updateProfile: (username: string) => Promise<User>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateAvatar: (avatarUrl: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  setTemporaryUser: async () => {},
  updateProfile: async () => { throw new Error('Not implemented'); },
  updatePassword: async () => { throw new Error('Not implemented'); },
  updateAvatar: async () => { throw new Error('Not implemented'); },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored user in localStorage
    const storedUser = localStorage.getItem('forum_chat_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('forum_chat_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // In a real app, we would send credentials to the server
      // For now, we'll simulate login with the temp user endpoint
      const response = await apiRequest('POST', '/api/auth/temp-user', { username });
      const data = await response.json();
      
      setUser(data);
      localStorage.setItem('forum_chat_user', JSON.stringify(data));
      
      toast({
        title: "Đăng nhập thành công",
        description: `Xin chào, ${data.username}!`,
      });
    } catch (error) {
      toast({
        title: "Đăng nhập thất bại",
        description: (error as Error).message || "Vui lòng thử lại sau",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', { 
        username, 
        password,
        isTemporary: false
      });
      const data = await response.json();
      
      setUser(data);
      localStorage.setItem('forum_chat_user', JSON.stringify(data));
      
      toast({
        title: "Đăng ký thành công",
        description: `Tài khoản ${data.username} đã được tạo!`,
      });
    } catch (error) {
      toast({
        title: "Đăng ký thất bại",
        description: (error as Error).message || "Vui lòng thử lại sau",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('forum_chat_user');
    toast({
      title: "Đã đăng xuất",
      description: "Hẹn gặp lại bạn sau!",
    });
  };

  const setTemporaryUser = async (username: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/temp-user', { username });
      const data = await response.json();
      
      setUser(data);
      localStorage.setItem('forum_chat_user', JSON.stringify(data));
      
      toast({
        title: "Đã đặt tên thành công",
        description: `Xin chào, ${data.username}!`,
      });
      
      return data;
    } catch (error) {
      toast({
        title: "Đặt tên thất bại",
        description: (error as Error).message || "Vui lòng thử lại sau",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Cập nhật thông tin người dùng
  const updateProfile = async (username: string): Promise<User> => {
    if (!user) {
      throw new Error('User not logged in');
    }

    try {
      const response = await apiRequest(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ username }),
        headers: { 'Content-Type': 'application/json' }
      });

      const updatedUser = response as User;
      
      // Cập nhật localStorage
      localStorage.setItem('forum_chat_user', JSON.stringify(updatedUser));
      localStorage.setItem('username', updatedUser.username);
      
      // Cập nhật state
      setUser(updatedUser);
      
      toast({
        title: 'Cập nhật thành công',
        description: 'Thông tin cá nhân đã được cập nhật',
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Cập nhật thất bại',
        description: 'Không thể cập nhật thông tin cá nhân',
        variant: 'destructive',
      });
      throw error;
    }
  };
  
  // Đổi mật khẩu
  const updatePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) {
      throw new Error('User not logged in');
    }
    
    try {
      await apiRequest(`/api/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      toast({
        title: 'Đổi mật khẩu thành công',
        description: 'Mật khẩu đã được cập nhật',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update password:', error);
      
      // Kiểm tra mã lỗi để đưa ra thông báo phù hợp
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Không thể cập nhật mật khẩu';
      
      toast({
        title: 'Đổi mật khẩu thất bại',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return false;
    }
  };
  
  // Cập nhật avatar
  const updateAvatar = async (avatarUrl: string): Promise<User> => {
    if (!user) {
      throw new Error('User not logged in');
    }
    
    try {
      const response = await apiRequest(`/api/users/${user.id}/avatar`, {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const updatedUser = response as User;
      
      // Cập nhật localStorage
      localStorage.setItem('forum_chat_user', JSON.stringify(updatedUser));
      
      // Cập nhật state
      setUser(updatedUser);
      
      toast({
        title: 'Cập nhật avatar thành công',
        description: 'Avatar đã được cập nhật',
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to update avatar:', error);
      
      toast({
        title: 'Cập nhật avatar thất bại',
        description: 'Không thể cập nhật avatar',
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isLoading,
        login,
        register,
        logout, 
        setTemporaryUser,
        updateProfile,
        updatePassword,
        updateAvatar
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
