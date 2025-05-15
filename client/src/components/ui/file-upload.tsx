import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image, Video, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string;
  maxSizeMB?: number;
  value?: File[];
  className?: string;
}

export function FileUpload({ 
  onFileSelect, 
  maxFiles = 5, 
  acceptedTypes = 'image/*,video/*,audio/*', 
  maxSizeMB = 10,
  value = [],
  className = ''
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>(value);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Check if max files exceeded
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Không thể tải quá ${maxFiles} tệp`);
      return;
    }
    
    // Check file size and type
    const invalidFiles = selectedFiles.filter(file => {
      const isValidType = acceptedTypes.split(',').some(type => {
        if (type.includes('*')) {
          const mainType = type.split('/')[0];
          return file.type.startsWith(`${mainType}/`);
        }
        return file.type === type;
      });
      
      const isValidSize = file.size <= maxSizeBytes;
      
      return !isValidType || !isValidSize;
    });
    
    if (invalidFiles.length > 0) {
      setError(`Một số tệp không hợp lệ. Kích thước tối đa: ${maxSizeMB}MB`);
      return;
    }
    
    setError(null);
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    onFileSelect(newFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    onFileSelect(newFiles);
  };
  
  const renderFilePreview = (file: File, index: number) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (isImage) {
      return (
        <div key={index} className="relative group">
          <img 
            src={URL.createObjectURL(file)} 
            alt={file.name}
            className="h-20 w-20 object-cover rounded-md"
          />
          <button 
            className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeFile(index)}
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      );
    }
    
    if (isVideo) {
      return (
        <div key={index} className="relative group">
          <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
            <Video className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>
          <button 
            className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => removeFile(index)}
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      );
    }
    
    return (
      <div key={index} className="relative group">
        <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
          <span className="text-xs text-center text-gray-500 dark:text-gray-400 p-2 truncate">
            {file.name}
          </span>
        </div>
        <button 
          className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => removeFile(index)}
        >
          <X className="h-3 w-3 text-white" />
        </button>
      </div>
    );
  };
  
  return (
    <div className={className}>
      <div className="flex items-center space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={files.length >= maxFiles}
        >
          <Image className="mr-2 h-4 w-4" />
          Tải lên
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept={acceptedTypes}
          onChange={handleFileChange}
          className="hidden"
        />
        <span className="text-xs text-muted-foreground">
          {maxFiles - files.length} tệp còn lại
        </span>
      </div>
      
      {error && (
        <p className="text-destructive text-sm mt-1">{error}</p>
      )}
      
      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((file, index) => renderFilePreview(file, index))}
        </div>
      )}
    </div>
  );
}
