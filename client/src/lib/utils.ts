import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  toVNTime, 
  formatDateTime, 
  formatDate, 
  formatVietnameseDate,
  timeFromNow 
} from './dayjs';

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
  // Sử dụng dayjs thay vì xử lý thủ công
  return formatDateTime(date, 'HH:mm DD/MM/YYYY');
}

export function formatRelativeTime(date: string | Date): string {
  // Sử dụng dayjs để hiển thị thời gian tương đối
  return timeFromNow(date);
}

/**
 * Adjust a date to Vietnam's timezone (UTC+7)
 * @param date The date to adjust
 * @returns Adjusted date in Vietnam timezone
 */
export const adjustToVietnamTimezone = (date: Date): Date => {
  // Sử dụng dayjs và chuyển đổi về đối tượng Date
  return toVNTime(date).toDate();
};
