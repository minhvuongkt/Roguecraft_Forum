
import React, { useState, useEffect } from "react";
import { useLocation, useRoute, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LoginModal } from "@/components/LoginModal";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Camera,
  UserCircle,
  Lock,
  Mail,
  Cake,
  MapPin,
  AtSign,
  Calendar,
  User,
  Loader2,
  AlignLeft,
  CheckCircle2,
  X
} from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  avatar: string | null;
  isTemporary: boolean;
  bio?: string;
  joinDate?: string;
  location?: string;
  email?: string;
  birthday?: string;
  totalPosts?: number;
  totalComments?: number;
}

export default function UserProfilePage() {
  // URL params - sử dụng wouter thay vì react-router-dom
  const [, navigate] = useLocation();
  const [, params] = useRoute("/user/:id");
  const id = params?.id;
  
  const { user: currentUser, isAuthenticated, updateProfile, updatePassword, updateAvatar } = useAuth();
  const { toast } = useToast();

  // State hooks
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [formData, setFormData] = useState({
    bio: "",
    location: "",
    email: "",
    birthday: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Kiểm tra id và chuyển hướng nếu không hợp lệ
  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      navigate('/forum');
      return;
    }
  }, [id, navigate]);

  // Đảm bảo người dùng đã đăng nhập
  useEffect(() => {
    // Nếu không phải là profile của người dùng hiện tại, cho phép xem
    if (currentUser && Number(id) === currentUser.id) {
      return;
    }
    
    // Xem profile người khác không cần đăng nhập
  }, [currentUser, id, navigate]);
  
  // Configure fetcher trực tiếp để xử lý lỗi tốt hơn
  const { data, isLoading: isDataLoading, error } = useQuery<UserProfile>({
    queryKey: ['users', id],
    enabled: !!id,
    retry: 2,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const res = await fetch(`/api/users/${id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch user data');
        }
        return res.json();
      } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }
    }
  });

  // Cập nhật form data khi có dữ liệu
  useEffect(() => {
    if (data) {
      setFormData({
        bio: data.bio || "",
        location: data.location || "",
        email: data.email || "",
        birthday: data.birthday || "",
      });
    }
  }, [data]);

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar image must be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    // Preview the avatar
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload avatar
  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    
    setIsAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }
      
      const data = await response.json();
      updateAvatar(data.avatar);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });
      
      // Reset states
      setAvatarFile(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // Form input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Password input change handler
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    setPasswordError("");
  };

  // Update profile handler
  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      // Call API to update profile
      await updateProfile({
        bio: formData.bio,
        location: formData.location,
        email: formData.email,
        birthday: formData.birthday,
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update password handler
  const handleUpdatePassword = async () => {
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    
    setIsPasswordUpdating(true);
    try {
      // Call API to update password
      await updatePassword(passwordData.currentPassword, passwordData.newPassword);
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully",
      });
      
      // Reset form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || "Failed to update password");
      toast({
        title: "Update failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    // Reset form data to original values
    if (data) {
      setFormData({
        bio: data.bio || "",
        location: data.location || "",
        email: data.email || "",
        birthday: data.birthday || "",
      });
    }
    setIsEditing(false);
  };

  // Cancel avatar upload
  const handleCancelAvatarUpload = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // Format join date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Loading state
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Đang tải thông tin người dùng...</span>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Không tìm thấy</h1>
        <p className="mb-4">Không thể tìm thấy thông tin người dùng này.</p>
        <Button variant="outline" onClick={() => navigate('/forum')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại Forum
        </Button>
      </div>
    );
  }

  // Check if this is the current user's profile
  const isCurrentUserProfile = currentUser && currentUser.id === data.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-32"></div>
        <div className="p-6 relative">
          <div className="absolute -top-12 left-6 border-4 border-white dark:border-gray-800 rounded-full">
            <Avatar className="h-24 w-24">
              {data.avatar ? (
                <AvatarImage src={data.avatar} alt={data.username} />
              ) : (
                <AvatarFallback className="bg-purple-600 text-xl">
                  {data.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            
            {/* Avatar upload overlay - only for current user */}
            {isCurrentUserProfile && !avatarPreview && (
              <label className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="h-8 w-8 text-white" />
                <input 
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>
          
          {/* Avatar preview and upload controls */}
          {avatarPreview && (
            <div className="absolute -top-12 left-6 border-4 border-white dark:border-gray-800 rounded-full">
              <div className="relative">
                <img 
                  src={avatarPreview} 
                  alt="Avatar preview" 
                  className="h-24 w-24 rounded-full object-cover"
                />
                <div className="absolute -top-2 -right-2 flex space-x-1">
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="h-6 w-6 p-0 rounded-full" 
                    onClick={handleCancelAvatarUpload}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="h-6 w-6 p-0 rounded-full" 
                    onClick={handleAvatarUpload}
                    disabled={isAvatarUploading}
                  >
                    {isAvatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {data.username}
                  {!data.isTemporary && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                      Thành viên
                    </span>
                  )}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Tham gia từ {formatDate(data.joinDate)}
                </p>
              </div>
              
              {isCurrentUserProfile && !isEditing && (
                <Button onClick={() => setIsEditing(true)}>
                  Chỉnh sửa hồ sơ
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 pt-6">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">
                <UserCircle className="h-4 w-4 mr-2" />
                Hồ sơ
              </TabsTrigger>
              {isCurrentUserProfile && (
                <TabsTrigger value="settings" className="flex-1">
                  <Lock className="h-4 w-4 mr-2" />
                  Bảo mật
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          
          <TabsContent value="profile" className="p-6">
            {isEditing ? (
              /* Editing mode */
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bio">Giới thiệu</Label>
                  <Input
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Hãy chia sẻ đôi điều về bạn..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email của bạn"
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Địa điểm</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Bạn đến từ đâu?"
                  />
                </div>
                
                <div>
                  <Label htmlFor="birthday">Ngày sinh</Label>
                  <Input
                    id="birthday"
                    name="birthday"
                    type="date"
                    value={formData.birthday}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      'Lưu thay đổi'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="space-y-4">
                {data.bio ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <AlignLeft className="h-4 w-4 mr-2" />
                      Giới thiệu
                    </h3>
                    <p className="mt-1">{data.bio}</p>
                  </div>
                ) : isCurrentUserProfile ? (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Bạn chưa thêm thông tin giới thiệu
                    </p>
                    <Button 
                      variant="link" 
                      onClick={() => setIsEditing(true)}
                      className="mt-2"
                    >
                      Thêm ngay
                    </Button>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Người dùng chưa thêm thông tin giới thiệu
                    </p>
                  </div>
                )}
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-500 mr-2">Email:</span>
                      <span>{data.email}</span>
                    </div>
                  )}
                  
                  {data.location && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-500 mr-2">Địa điểm:</span>
                      <span>{data.location}</span>
                    </div>
                  )}
                  
                  {data.birthday && (
                    <div className="flex items-center">
                      <Cake className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-500 mr-2">Ngày sinh:</span>
                      <span>{formatDate(data.birthday)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">Ngày tham gia:</span>
                    <span>{formatDate(data.joinDate)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-500 mr-2">Trạng thái:</span>
                    <span>
                      {data.isTemporary ? (
                        <span className="text-amber-600 dark:text-amber-400">Tạm thời</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">Thành viên</span>
                      )}
                    </span>
                  </div>
                </div>
                
                <Separator />
                
                {/* Stats */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Thống kê hoạt động
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-center">
                      <p className="text-2xl font-bold">{data.totalPosts || 0}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bài viết</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-center">
                      <p className="text-2xl font-bold">{data.totalComments || 0}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bình luận</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          {isCurrentUserProfile && (
            <TabsContent value="settings" className="p-6">
              <h2 className="text-lg font-semibold mb-4">Cài đặt bảo mật</h2>
              
              {data.isTemporary ? (
                <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-md mb-6">
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">Tài khoản tạm thời</h3>
                  <p className="mt-1 text-amber-700 dark:text-amber-300">
                    Bạn đang sử dụng tài khoản tạm thời. Để đặt mật khẩu và chuyển đổi thành tài khoản thường trực, vui lòng đăng ký một tài khoản mới.
                  </p>
                  <Button 
                    className="mt-3" 
                    variant="outline"
                    onClick={() => setIsLoginModalOpen(true)}
                  >
                    Đăng ký tài khoản
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                    />
                  </div>
                  
                  {passwordError && (
                    <div className="text-red-500 text-sm">{passwordError}</div>
                  )}
                  
                  <div className="pt-4">
                    <Button 
                      onClick={handleUpdatePassword}
                      disabled={isPasswordUpdating}
                    >
                      {isPasswordUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang cập nhật...
                        </>
                      ) : (
                        'Cập nhật mật khẩu'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        defaultTab="signup"
      />
    </div>
  );
}
