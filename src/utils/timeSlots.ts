/** Get current date in Europe/Rome timezone as YYYY-MM-DD string */
export const getTodayInRome = (): string => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
};

/** Get tomorrow's date in Europe/Rome timezone as YYYY-MM-DD string */
export const getTomorrowInRome = (): string => {
  const today = getTodayInRome();
  const [year, month, day] = today.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + 1);
  return utcDate.toISOString().slice(0, 10);
};

/** Get yesterday's date in Europe/Rome timezone as YYYY-MM-DD string */
export const getYesterdayInRome = (): string => {
  const today = getTodayInRome();
  const [year, month, day] = today.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - 1);
  return utcDate.toISOString().slice(0, 10);
};

/** Format a date string as Italian long date (es. "giovedì 10 aprile 2026") */
export const formatDateIT = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('it-IT', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/** Format ISO timestamp to HH:MM (local display) */
export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('it-IT', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/** Returns true if a program is currently live */
export const isProgramLive = (startTime: string, endTime: string): boolean => {
  const now = Date.now();
  return new Date(startTime).getTime() <= now && now < new Date(endTime).getTime();
};

/** Returns the hour (Rome time) of an ISO timestamp */
export const getRomeHour = (isoString: string): number => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    hour12: false,
  });
  return parseInt(formatter.format(new Date(isoString)));
};
