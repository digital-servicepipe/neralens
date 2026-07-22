export interface ParsedLogDate {
  parsedAt: Date | null;
  date: string;
  hour: number | null;
  minute: number | null;
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseLogDate(raw: string): ParsedLogDate {
  const text = raw.trim();
  const explicitDate = text.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (explicitDate) {
    const [, y, m, d, hh, mm] = explicitDate;
    const parsed = new Date(text);
    return {
      parsedAt: Number.isNaN(parsed.getTime()) ? null : parsed,
      date: formatDateParts(Number(y), Number(m), Number(d)),
      hour: hh ? Number(hh) : null,
      minute: mm ? Number(mm) : null,
    };
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return { parsedAt: null, date: 'Unknown', hour: null, minute: null };

  return {
    parsedAt: parsed,
    date: formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()),
    hour: parsed.getHours(),
    minute: parsed.getMinutes(),
  };
}
