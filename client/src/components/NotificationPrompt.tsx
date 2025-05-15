import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationPrompt() {
  const { isPromptVisible, requestPermission, dismissPrompt } = useNotifications();

  if (!isPromptVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-10 max-w-sm">
      <Card className="shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="font-medium">Bật thông báo?</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Đừng bỏ lỡ tin nhắn và bài viết mới! Cho phép thông báo ngay.
              </p>
              <div className="mt-3 flex space-x-2">
                <Button size="sm" onClick={requestPermission}>
                  Cho phép
                </Button>
                <Button size="sm" variant="outline" onClick={dismissPrompt}>
                  Để sau
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
