import type { useAnalytics } from '../analytics/useAnalytics';
import type { LogRow } from '../../shared/types/domain';
import { requestCountFor } from '../analytics/selectors';

type Analytics = ReturnType<typeof useAnalytics>;

export const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-oss-20b:free';
export const FALLBACK_OPENROUTER_MODELS = [
  DEFAULT_OPENROUTER_MODEL,
  'tencent/hy3:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-coder:free',
];

export const DEFAULT_AI_PROMPT = `Ты NeraLens AI, аналитик логов AI-ботов.
Отвечай по-русски, коротко и по делу.
В контексте есть только разрешённые агрегированные поля: path, userAgent, requests, firstSeen, lastSeen, days, hours, statuses.
Не проси и не придумывай домены, IP, страны, ASN, cookie, токены, id пользователей, query params или любые поля вне переданного агрегата.
Если данных не хватает, прямо скажи, какого разрешённого среза не хватает.
Сначала дай вывод, затем важные аномалии и практичные рекомендации.
Форматируй Markdown-разметкой: короткие заголовки, списки, жирное для важных выводов, inline-code для path и user-agent.`;

const MAX_AI_AGGREGATES = 260;
const MAX_DAILY_BUCKETS = 45;

interface AiAggregate {
  path: string;
  userAgent: string;
  requests: number;
  firstSeen: string | null;
  lastSeen: string | null;
  days: Array<{ date: string; requests: number }>;
  hours: Array<{ hour: number; requests: number }>;
  statuses: Array<{ status: string; requests: number }>;
}

function sanitizePath(path: string) {
  const withoutOrigin = path.replace(/^https?:\/\/[^/]+/i, '');
  const withoutQuery = withoutOrigin.split(/[?#]/)[0] || '/';
  return withoutQuery
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      const decoded = safeDecode(segment);
      if (looksSensitiveSegment(decoded)) return ':id';
      return decoded.replace(/[^\wА-Яа-яЁё.\-~:@]/g, '_').slice(0, 90);
    })
    .join('/');
}

function sanitizeUserAgent(userAgent: string) {
  return userAgent
    .replace(/\s+/g, ' ')
    .replace(/https?:\/\/[^\s;)]+/gi, '[url]')
    .replace(/[^\wА-Яа-яЁё\s./;:+()_\-[\]]/g, '_')
    .trim()
    .slice(0, 220) || 'Unknown';
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function looksSensitiveSegment(segment: string) {
  if (/^[a-f0-9]{16,}$/i.test(segment)) return true;
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment)) return true;
  if (/^\d{5,}$/.test(segment)) return true;
  if (/^[A-Za-z0-9_-]{24,}$/.test(segment)) return true;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(segment)) return true;
  return false;
}

function rowTimestamp(row: LogRow) {
  if (!row.date || row.date === 'Unknown') return row.datetimeRaw || null;
  const time = row.hour == null ? '' : `T${String(row.hour).padStart(2, '0')}:${String(row.minute ?? 0).padStart(2, '0')}`;
  return `${row.date}${time}`;
}

function sortedDayBuckets(days: Map<string, number>) {
  return Array.from(days.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-MAX_DAILY_BUCKETS)
    .map(([date, requests]) => ({ date, requests }));
}

function sortedHourBuckets(hours: Map<number, number>) {
  return Array.from(hours.entries())
    .sort(([hourA], [hourB]) => hourA - hourB)
    .map(([hour, requests]) => ({ hour, requests }));
}

function sortedStatusBuckets(statuses: Map<string, number>) {
  return Array.from(statuses.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .map(([status, requests]) => ({ status, requests }));
}

export function buildAiContextPackage({ analytics }: { analytics: Analytics }) {
  const byPair = new Map<string, AiAggregate & { dayMap: Map<string, number>; hourMap: Map<number, number>; statusMap: Map<string, number> }>();

  analytics.filteredRows.forEach((row) => {
    const path = sanitizePath(row.path);
    const userAgent = sanitizeUserAgent(row.httpUserAgent);
    const key = `${path}\n${userAgent}`;
    const seenAt = rowTimestamp(row);
    const current = byPair.get(key) ?? {
      path,
      userAgent,
      requests: 0,
      firstSeen: null,
      lastSeen: null,
      days: [],
      hours: [],
      statuses: [],
      dayMap: new Map<string, number>(),
      hourMap: new Map<number, number>(),
      statusMap: new Map<string, number>(),
    };

    const count = requestCountFor(row);
    current.requests += count;
    if (seenAt && (!current.firstSeen || seenAt < current.firstSeen)) current.firstSeen = seenAt;
    if (seenAt && (!current.lastSeen || seenAt > current.lastSeen)) current.lastSeen = seenAt;
    if (row.date && row.date !== 'Unknown') current.dayMap.set(row.date, (current.dayMap.get(row.date) ?? 0) + count);
    if (typeof row.hour === 'number') current.hourMap.set(row.hour, (current.hourMap.get(row.hour) ?? 0) + count);
    current.statusMap.set(row.requestStatus || 'Unknown', (current.statusMap.get(row.requestStatus || 'Unknown') ?? 0) + count);
    byPair.set(key, current);
  });

  return Array.from(byPair.values())
    .sort((a, b) => b.requests - a.requests)
    .slice(0, MAX_AI_AGGREGATES)
    .map(({ dayMap, hourMap, statusMap, ...item }) => ({
      ...item,
      days: sortedDayBuckets(dayMap),
      hours: sortedHourBuckets(hourMap),
      statuses: sortedStatusBuckets(statusMap),
    }));
}
