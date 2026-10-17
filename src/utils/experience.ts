// Professional experience starts with the .msg Systems role (01/2024).
export const CAREER_START = '2024-01';

/** Whole years elapsed since a "YYYY-MM" month, floored at 1. */
export function yearsSince(start: string = CAREER_START, now: Date = new Date()): number {
  const [year, month] = start.split('-').map(Number);
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.max(1, Math.floor(months / 12));
}

/** Parses the "MM/YYYY" or "Present" dates used in experience.json. */
export function parseMonth(value: string): Date {
  if (value === 'Present') return new Date();
  const [month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, 1);
}

/** "1y 3mo"-style span between two experience.json dates, end month inclusive. */
export function duration(startDate: string, endDate: string): string {
  const start = parseMonth(startDate);
  const end = parseMonth(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y}y` : '', m ? `${m}mo` : ''].filter(Boolean).join(' ');
}
