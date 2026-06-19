import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatTime(isoString: string, format: string = 'HH:mm') {
  return dayjs(isoString).format(format);
}

export function formatDate(isoString: string, format: string = 'YYYY-MM-DD') {
  return dayjs(isoString).format(format);
}

export function timeFromNow(isoString: string) {
  return dayjs(isoString).fromNow();
}

export function generateId(prefix: string = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: NodeJS.Timeout | null = null;
  return ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
