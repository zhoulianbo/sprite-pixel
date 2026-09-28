export type DailyCheckInStatus = {
  credits: number;
  today: string;
  checkedInToday: boolean;
  week: string[];
  checkedDates: string[];
  weekCount: number;
  streak: number;
};

export function zonedDateKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) {
    throw new Error('INVALID_CHECK_IN_DATE');
  }
  return `${year}-${month}-${day}`;
}

function utcNoon(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function addCalendarDays(dateKey: string, days: number) {
  const date = utcNoon(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function mondayOfWeek(dateKey: string) {
  const weekday = utcNoon(dateKey).getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addCalendarDays(dateKey, offset);
}

export function weekDateKeys(todayKey: string) {
  const monday = mondayOfWeek(todayKey);
  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(monday, index)
  );
}

export function checkInStreak(checkedDates: string[], todayKey: string) {
  const checked = new Set(checkedDates);
  let cursor = checked.has(todayKey) ? todayKey : addCalendarDays(todayKey, -1);
  let streak = 0;
  while (checked.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export function buildCheckInStatus({
  credits,
  today,
  checkedDates,
}: {
  credits: number;
  today: string;
  checkedDates: string[];
}): DailyCheckInStatus {
  const week = weekDateKeys(today);
  const checked = new Set(checkedDates);
  return {
    credits,
    today,
    checkedInToday: checked.has(today),
    week,
    checkedDates,
    weekCount: week.filter((date) => checked.has(date)).length,
    streak: checkInStreak(checkedDates, today),
  };
}

export function calendarDateParts(dateKey: string, locale: string) {
  const date = utcNoon(dateKey);
  return {
    month: new Intl.DateTimeFormat(locale, {
      month: 'short',
      timeZone: 'UTC',
    }).format(date),
    day: date.getUTCDate(),
    weekday: new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(date),
  };
}
