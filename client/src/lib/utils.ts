import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to Vietnamese timezone (UTC+7)
 * @param date The date to format (string or Date object)
 * @param options Intl.DateTimeFormatOptions to customize the output
 * @returns Formatted date string in Vietnamese timezone
 */
export function formatVietnameseDateTime(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }
): string {
  const d = new Date(date);
  // Adjust to Vietnam timezone (UTC+7)
  d.setHours(d.getHours() + 7);
  return d.toLocaleString("vi-VN", options);
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  // Adjust to Vietnam timezone (UTC+7)
  d.setHours(d.getHours() + 7);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return "vừa xong";
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} phút trước`;
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} giờ trước`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} ngày trước`;
  }

  // Format as full date
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
