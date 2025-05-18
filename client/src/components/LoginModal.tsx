import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  
  const { login, register } = useAuth();
  const { toast } = useToast();
  const validateUsername = (username: string): boolean => {
    // Validate username: only Latin characters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(username);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate username format
    if (!validateUsername(username)) {
      setUsernameError('Tên đăng nhập chỉ được chứa chữ cái Latin, số và dấu gạch dưới (_)');
      toast({
        title: 'Lỗi',
        description: 'Tên đăng nhập chỉ được chứa chữ cái Latin, số và dấu gạch dưới (_)',
        variant: 'destructive',
      });
      return;
    }
    
    // Clear any existing errors
    setUsernameError('');
    
    setIsLoading(true);
    
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        // Validate passwords match
        if (password !== confirmPassword) {
          toast({
            title: 'Lỗi',
            description: 'Mật khẩu xác nhận không khớp',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        
        await register(username, password);
      }
      
      // Clear form and close modal on success
      handleClose();
    } catch (error) {
      // Error is already handled in the auth context
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleClose = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setUsernameError('');
    setMode('login');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản mới'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login'
              ? 'Đăng nhập để tham gia thảo luận và trò chuyện'
              : 'Tạo tài khoản để lưu lịch sử và tham gia cộng đồng'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  const value = e.target.value;
                  setUsername(value);
                  
                  if (value && !validateUsername(value)) {
                    setUsernameError('Tên đăng nhập chỉ được chứa chữ cái Latin, số và dấu gạch dưới (_)');
                  } else {
                    setUsernameError('');
                  }
                }}
                placeholder="Nhập tên đăng nhập"
                required
                disabled={isLoading}
              />
              {usernameError && (
                <div className="text-xs text-red-500 mt-1">{usernameError}</div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                disabled={isLoading}
              />
            </div>
            
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rememberMe" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="rememberMe" className="text-sm">
                    Ghi nhớ đăng nhập
                  </Label>
                </div>
                <Button variant="link" size="sm" className="px-0" disabled={isLoading}>
                  Quên mật khẩu?
                </Button>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              Bạn cũng có thể tạo tên để chat bằng cách nhập "/ten [tên của bạn]" trong khung chat
            </div>
          </div>
          
          <DialogFooter className="mt-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              disabled={isLoading}
            >
              {mode === 'login' ? 'Tạo tài khoản mới' : 'Đã có tài khoản?'}
            </Button>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
