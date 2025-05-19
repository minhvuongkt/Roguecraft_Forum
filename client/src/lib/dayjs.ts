// Import các phần cần thiết của dayjs
import dayjs from 'dayjs';
import 'dayjs/locale/vi'; 
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// dayjs.locale('vi');
// const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh'; 
const VIETNAM_TIMEZONE = 'UTC'; 

export const toVNTime = (date: string | Date | number) => {
  return dayjs(date).tz(VIETNAM_TIMEZONE);
};

export const formatDateTime = (date: string | Date | number, format: string = 'DD/MM/YYYY HH:mm:ss') => {
  return toVNTime(date).format(format);
};

export const formatDate = (date: string | Date | number) => {
  return toVNTime(date).format('DD/MM/YYYY');
};

export const formatVietnameseDate = (date: string | Date | number) => {
  const d = toVNTime(date);
  return `${d.format('DD')} tháng ${d.format('MM')} năm ${d.format('YYYY')}`;
};

export const timeFromNow = (date: string | Date | number) => {
  return toVNTime(date).fromNow();
};

export const isPast = (date: string | Date | number) => {
  return toVNTime(date).isBefore(dayjs());
};

export default {
  toVNTime,
  formatDateTime,
  formatDate,
  formatVietnameseDate,
  timeFromNow,
  isPast,
};
