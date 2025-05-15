import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return;
    }

    // Get current permission status
    setPermissionStatus(Notification.permission);

    // Show prompt after 3 seconds if permission is not determined yet
    if (Notification.permission === 'default') {
      const promptTimer = setTimeout(() => {
        setIsPromptVisible(true);
      }, 3000);

      return () => clearTimeout(promptTimer);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Không hỗ trợ',
        description: 'Trình duyệt của bạn không hỗ trợ thông báo đẩy',
        variant: 'destructive',
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      setIsPromptVisible(false);

      if (permission === 'granted') {
        toast({
          title: 'Đã bật thông báo',
          description: 'Bạn sẽ nhận được thông báo khi có tin nhắn mới',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Thông báo bị từ chối',
          description: 'Bạn có thể bật lại thông báo trong cài đặt trình duyệt',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể yêu cầu quyền thông báo',
        variant: 'destructive',
      });
    }
  };

  const dismissPrompt = () => {
    setIsPromptVisible(false);
    
    // Remember that user dismissed the prompt
    localStorage.setItem('notification_prompt_dismissed', 'true');
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      return new Notification(title, options);
    }
    return null;
  };

  return {
    permissionStatus,
    isPromptVisible,
    requestPermission,
    dismissPrompt,
    sendNotification,
  };
}
