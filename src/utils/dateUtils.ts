import { DeadlineFilter, Task } from '../types/todo';

export type DeadlineSeverity = 'none' | 'completed' | 'overdue' | 'urgent' | 'upcoming';

export interface DeadlineInfo {
  severity: DeadlineSeverity;
  shortDate: string; // e.g., "25.11"
  timeText: string; // e.g., "23:59"
  fullDateText: string; // e.g., "25.11.2026, 23:59"
  statusText: string; // e.g., "осталось 00д 21ч 49м" | "выполнено" | "просрочено 01д 02ч"
}

export const MONTHS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const WEEKDAYS_SHORT_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function pad2(n: number): string {
  return String(Math.floor(Math.abs(n))).padStart(2, '0');
}

/** Format a local Date object to 'YYYY-MM-DDTHH:mm' */
export function toLocalDateTimeString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Format a local Date object to 'YYYY-MM-DD' */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parse 'YYYY-MM-DDTHH:mm' or 'YYYY-MM-DD' as local Date */
export function parseDueDate(dueDate: string | null): Date | null {
  if (!dueDate) return null;
  const normalized = dueDate.includes('T') ? dueDate : `${dueDate}T23:59`;
  const [datePart, timePart] = normalized.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = (timePart || '23:59').split(':').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 23, Number.isFinite(mm) ? mm : 59, 0, 0);
}

/** Split stored dueDate into separate date ('YYYY-MM-DD') and time ('HH:mm') inputs */
export function splitDueDate(dueDate: string | null): { date: string; time: string } {
  if (!dueDate) return { date: '', time: '23:59' };
  const [datePart, timePart] = dueDate.split('T');
  return {
    date: datePart || '',
    time: timePart ? timePart.slice(0, 5) : '23:59',
  };
}

/** Combine separate date and time inputs into 'YYYY-MM-DDTHH:mm' or null */
export function combineDueDate(date: string, time: string): string | null {
  const trimmedDate = date.trim();
  if (!trimmedDate) return null;
  const safeTime = /^\d{2}:\d{2}$/.test(time.trim()) ? time.trim() : '23:59';
  return `${trimmedDate}T${safeTime}`;
}

/** Compute live deadline status text and severity */
export function getDeadlineInfo(task: Task, nowMs: number): DeadlineInfo {
  const parsed = parseDueDate(task.dueDate);
  if (!parsed) {
    return {
      severity: task.completed ? 'completed' : 'none',
      shortDate: '',
      timeText: '',
      fullDateText: 'Без дедлайна',
      statusText: task.completed ? 'выполнено' : '',
    };
  }

  const shortDate = `${pad2(parsed.getDate())}.${pad2(parsed.getMonth() + 1)}`;
  const timeText = `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
  const fullDateText = `${shortDate}.${parsed.getFullYear()}, ${timeText}`;

  if (task.completed) {
    return {
      severity: 'completed',
      shortDate,
      timeText,
      fullDateText,
      statusText: 'выполнено',
    };
  }

  const diffMs = parsed.getTime() - nowMs;
  const totalMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (diffMs < 0) {
    const overdueStr =
      days > 0
        ? `просрочено ${pad2(days)}д ${pad2(hours)}ч`
        : `просрочено ${pad2(hours)}ч ${pad2(minutes)}м`;
    return {
      severity: 'overdue',
      shortDate,
      timeText,
      fullDateText,
      statusText: overdueStr,
    };
  }

  const remainingStr = `осталось ${pad2(days)}д ${pad2(hours)}ч ${pad2(minutes)}м`;
  const isUrgent = diffMs <= 24 * 60 * 60 * 1000;

  return {
    severity: isUrgent ? 'urgent' : 'upcoming',
    shortDate,
    timeText,
    fullDateText,
    statusText: remainingStr,
  };
}

export function matchesDeadlineFilter(task: Task, filter: DeadlineFilter, nowMs: number): boolean {
  if (filter === 'all') return true;
  const parsed = parseDueDate(task.dueDate);

  if (filter === 'none') {
    return parsed === null;
  }
  if (!parsed) return false;

  const now = new Date(nowMs);
  const diffMs = parsed.getTime() - nowMs;

  switch (filter) {
    case 'today':
      return toLocalDateKey(parsed) === toLocalDateKey(now);
    case 'urgent':
      return !task.completed && diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
    case 'week': {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfWeek = startOfToday + 7 * 24 * 60 * 60 * 1000;
      return parsed.getTime() >= startOfToday && parsed.getTime() <= endOfWeek;
    }
    case 'overdue':
      return !task.completed && diffMs < 0;
    default:
      return true;
  }
}

export interface CalendarCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

/** Generate 6-week (42-day) Monday-first calendar grid for a given year & 0-indexed month */
export function buildMonthCalendarGrid(year: number, month: number, nowDate: Date): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startDayOfWeek = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startDayOfWeek);
  const todayKey = toLocalDateKey(nowDate);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = toLocalDateKey(cellDate);
    cells.push({
      date: cellDate,
      dateKey: key,
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === month && cellDate.getFullYear() === year,
      isToday: key === todayKey,
    });
  }
  return cells;
}

/** Russian plural helper: pluralizeRu(3, 'задача', 'задачи', 'задач') -> '3 задачи' */
export function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return `${count} ${many}`;
  if (mod10 === 1) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}

export function formatRussianFullDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}
