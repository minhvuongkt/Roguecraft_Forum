import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  title,
}: ImageViewerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="p-4 flex justify-between items-start border-b">
          {title && <DialogTitle>{title}</DialogTitle>}
          <DialogClose asChild>
            <button 
              className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="p-1 flex items-center justify-center bg-black/10 dark:bg-black/30 overflow-auto">
          <img 
            src={imageUrl}
            alt={title || "Hình ảnh"}
            className="max-h-[80vh] object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}