import React from 'react';

interface MessageColorPickerProps {
  onColorSelect: (color: string) => void;
}

export function MessageColorPicker({ onColorSelect }: MessageColorPickerProps) {
  const colors = [
    { name: 'Tím', value: 'msg-color-purple' },
    { name: 'Xanh dương', value: 'msg-color-blue' },
    { name: 'Xanh lá', value: 'msg-color-green' },
    { name: 'Đỏ', value: 'msg-color-red' },
    { name: 'Cam', value: 'msg-color-orange' },
    { name: 'Hồng', value: 'msg-color-pink' },
    { name: 'Vàng', value: 'msg-color-yellow' },
    { name: 'Xám', value: 'msg-color-gray' },
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