import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(weekday);
dayjs.extend(isoWeek);

export function nowISO(): string {
  return dayjs().toISOString();
}

export function daysBetween(from: string, to: string): number {
  const fromDate = dayjs(from);
  const toDate = dayjs(to);
  return Math.abs(toDate.diff(fromDate, 'day'));
}

export function startOfWeek(date?: string): string {
  const d = date ? dayjs(date) : dayjs();
  // isoWeek: Monday = 1
  return d.isoWeekday(1).startOf('day').toISOString();
}

export function endOfWeek(date?: string): string {
  const d = date ? dayjs(date) : dayjs();
  // isoWeek: Sunday = 7
  return d.isoWeekday(7).endOf('day').toISOString();
}
