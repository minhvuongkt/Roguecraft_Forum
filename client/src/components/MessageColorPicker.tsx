import React from 'react';

interface MessageColorPickerProps {
  onColorSelect: (color: string) => void;
}

export function MessageColorPicker({ onColorSelect }: MessageColorPickerProps) {
  // Danh sách các màu có thể chọn
  const colors = [
    { name: 'Tím', value: 'bg-purple-600' },
    { name: 'Xanh dương', value: 'bg-blue-600' },
    { name: 'Xanh lá', value: 'bg-green-600' },
    { name: 'Đỏ', value: 'bg-red-600' },
    { name: 'Cam', value: 'bg-orange-600' },
    { name: 'Hồng', value: 'bg-pink-600' },
    { name: 'Vàng', value: 'bg-yellow-500' },
    { name: 'Xám', value: 'bg-gray-600' },
  ];

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {colors.map((color) => (
        <button
          key={color.value}
          className={`w-8 h-8 rounded-full ${color.value} hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          onClick={() => onColorSelect(color.value)}
          title={color.name}
        />
      ))}
    </div>
  );
}