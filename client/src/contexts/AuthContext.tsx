import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
// Use the shared User type for consistency
import type { User, UserProfile } from '@/types/index';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setTemporaryUser: (username: string) => Promise<User>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<User>;
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
  setTemporaryUser: async () => { throw new Error('Not implemented'); },
  updateProfile: async () => { throw new Error('Not implemented'); },
  updatePassword: async () => { throw new Error('Not implemented'); },
  updateAvatar: async () => { throw new Error('Not implemented'); },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Helper to normalize user object to shared User type
  function normalizeUser(data: any): User {
    return {
      id: data.id,
      username: data.username,
      avatar: data.avatar ?? null,
      isTemporary: data.isTemporary ?? false,
      createdAt: data.createdAt ?? new Date(),
      lastActive: data.lastActive ?? new Date(),
    };
  }

  useEffect(() => {
    // Check for stored user in localStorage
    const storedUser = localStorage.getItem('forum_chat_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(normalizeUser(parsedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('forum_chat_user');
      }
    }
    setIsLoading(false);
  }, []);
  const login = async (username: string, password: string) => {
    if (!username || !password) {
      throw new Error('Username và mật khẩu không được để trống');
    }

    try {
      const response = await apiRequest('POST', '/api/auth/login', { 
        username,
        password 
      });
      
      const data = await response.json();

      // Kiểm tra response status
      if (!response.ok) {
        // Nếu server trả về thông báo lỗi cụ thể
        if (data.message) {
          throw new Error(data.message);
        }
        // Fallback cho các trường hợp khác
        throw new Error(response.status === 401 
          ? 'Username hoặc mật khẩu không đúng' 
          : 'Có lỗi xảy ra, vui lòng thử lại sau'
        );
      }
      
      // Kiểm tra dữ liệu trả về
      if (!data || !data.id) {
        throw new Error('Dữ liệu người dùng không hợp lệ');
      }

      // Kiểm tra người dùng tạm thời
      if (data.isTemporary) {
        throw new Error('Tài khoản này là tạm thời. Vui lòng đăng ký để tiếp tục.');
      }

      const normalizedUser = normalizeUser(data);
      
      // Lưu thông tin đăng nhập
      localStorage.setItem('forum_chat_user', JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      
      toast({
        title: "Đăng nhập thành công", 
        description: `Xin chào, ${normalizedUser.username}!`,
      });
    } catch (error) {
      console.error('Login error:', error);
      
      // Hiển thị thông báo lỗi phù hợp
      toast({
        title: "Đăng nhập thất bại",
        description: error instanceof Error 
          ? error.message 
          : "Vui lòng thử lại sau",
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
      
      setUser(normalizeUser(data));
      localStorage.setItem('forum_chat_user', JSON.stringify(normalizeUser(data)));
      
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
    if (!username) {
      throw new Error('Username không được để trống');
    }

    try {
      // Thêm prefix cho user tạm thời để dễ nhận biết
      const tempUsername = `${username}`;
      const response = await apiRequest('POST', '/api/auth/temp-user', { 
        username: tempUsername,
        isTemporary: true
      });

      if (!response.ok) {
        throw new Error('Không thể tạo người dùng tạm thời');
      }

      const data = await response.json();
      const normalizedUser = normalizeUser({
        ...data,
        isTemporary: true,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // Hết hạn sau 14 ngày
      });
      
      setUser(normalizedUser);
      localStorage.setItem('forum_chat_user', JSON.stringify(normalizedUser));
      
      toast({
        title: "Đã đặt tên thành công",
        description: `Xin chào khách ${username}! Lưu ý rằng tài khoản này sẽ hết hạn sau 24 giờ.`,
      });
      
      return normalizedUser;
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
  // Accepts a partial profile object for extensibility
  const updateProfile = async (profile: Partial<UserProfile>): Promise<User> => {
    if (!user) {
      throw new Error('User not logged in');
    }

    try {
      const response = await apiRequest('PUT', `/api/users/${user.id}`, profile);
      const updatedUser: User = normalizeUser(await response.json());
      localStorage.setItem('forum_chat_user', JSON.stringify(updatedUser));
      localStorage.setItem('username', updatedUser.username);
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
      await apiRequest('PUT', `/api/users/${user.id}/password`, { currentPassword, newPassword });      
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
      const response = await apiRequest('PUT', `/api/users/${user.id}/avatar`, { avatarUrl });

      const updatedUser: User = normalizeUser(await response.json());
      
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
