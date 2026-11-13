const LONDON_TIME_ZONE = 'Europe/London';

type LondonDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getLondonDateParts(date: Date): LondonDateParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, Number(part.value)]));

  return {
    year: values.get('year') ?? 0,
    month: values.get('month') ?? 0,
    day: values.get('day') ?? 0,
    hour: values.get('hour') ?? 0,
    minute: values.get('minute') ?? 0,
    second: values.get('second') ?? 0,
  };
}

function londonOffsetMinutes(date: Date): number {
  const timeZoneName = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIME_ZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;

  if (timeZoneName === 'GMT') return 0;
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(timeZoneName ?? '');
  if (!match) return 0;

  const direction = match[1] === '-' ? -1 : 1;
  return direction * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

export function getLondonDateKey(date: Date): string {
  const { year, month, day } = getLondonDateParts(date);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function addLondonCalendarDays(date: Date, days: number): Date {
  const { year, month, day } = getLondonDateParts(date);
  return new Date(Date.UTC(year, month - 1, day + days, 12));
}

export function createLondonDateTime(date: Date, time: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) throw new RangeError(`Invalid London prayer time: ${time}`);

  const { year, month, day } = getLondonDateParts(date);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new RangeError(`Invalid London prayer time: ${time}`);

  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
  let timestamp = wallClockUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    timestamp = wallClockUtc - londonOffsetMinutes(new Date(timestamp)) * 60_000;
  }
  return new Date(timestamp);
}

export function isLondonBST(date: Date): boolean {
  return londonOffsetMinutes(date) === 60;
}

export function getLondonWeekday(date: Date): number {
  const { year, month, day } = getLondonDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}
