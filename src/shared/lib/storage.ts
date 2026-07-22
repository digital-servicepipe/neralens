import { openDB } from 'idb';
import { parseLogDate } from './logDate';
import type { LogRow, PersistedState } from '../types/domain';

const dbName = 'ai-analytics-dashboard';
const storeName = 'state';
const stateKey = 'snapshot';

const emptyState: PersistedState = {
  version: 3,
  rows: [],
  files: [],
  sitemapFiles: [],
  robotsTxt: '',
};

async function db() {
  return openDB(dbName, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
    },
  });
}

function compactRows(rows: LogRow[]): LogRow[] {
  const map = new Map<string, LogRow>();

  rows.forEach((row) => {
    const key = [
      row.sid,
      row.datetimeRaw,
      row.dateRaw,
      row.path,
      row.httpUserAgent,
      row.botType,
      row.uaGroup,
      row.requestStatus,
      row.country,
      row.asn,
      row.subnet,
      row.netname,
      row.host,
      row.sslsignName,
    ].join('\u001f');
    const existing = map.get(key);
    if (existing) {
      existing.requestCount = (existing.requestCount ?? 1) + (row.requestCount ?? 1);
    } else {
      map.set(key, { ...row, requestCount: row.requestCount ?? 1 });
    }
  });

  return Array.from(map.values());
}

export async function loadPersistedState(): Promise<PersistedState> {
  const database = await db();
  const value = await database.get(storeName, stateKey);
  if (!value) return emptyState;
  return {
    ...emptyState,
    ...value,
    rows: compactRows((value.rows ?? []).map((row: any) => {
      const parsed = row.datetimeRaw ? parseLogDate(row.datetimeRaw) : { parsedAt: row.parsedAt ? new Date(row.parsedAt) : null };

      return {
        ...row,
        ...parsed,
        requestCount: row.requestCount ?? 1,
      };
    })),
  };
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  const database = await db();
  await database.put(storeName, state, stateKey);
}

export async function clearPersistedState(): Promise<void> {
  const database = await db();
  await database.delete(storeName, stateKey);
}
