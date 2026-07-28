import { openDB } from 'idb';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { parseLogDate } from './logDate';
import type { LogRow, PersistedState } from '../types/domain';

const dbName = 'ai-analytics-dashboard';
const storeName = 'state';
const stateKey = 'snapshot';
const fallbackKey = `${dbName}:${stateKey}`;
const compressedFallbackKey = `${fallbackKey}:compressed`;

const emptyState: PersistedState = {
  version: 4,
  rows: [],
  files: [],
  sitemapFiles: [],
  robotsTxt: '',
  servicepipeLogs: true,
};

async function db() {
  return openDB(dbName, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
    },
  });
}

function normalizePersistedState(value: Partial<PersistedState> | null | undefined): PersistedState {
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
    files: Array.isArray(value.files) ? value.files : [],
    sitemapFiles: Array.isArray(value.sitemapFiles) ? value.sitemapFiles : [],
    robotsTxt: typeof value.robotsTxt === 'string' ? value.robotsTxt : '',
    servicepipeLogs: typeof value.servicepipeLogs === 'boolean' ? value.servicepipeLogs : true,
  };
}

function loadFallbackState(): PersistedState {
  try {
    const compressed = localStorage.getItem(compressedFallbackKey);
    if (compressed) {
      const restored = decompressFromUTF16(compressed);
      if (restored) return normalizePersistedState(JSON.parse(restored));
    }

    return normalizePersistedState(JSON.parse(localStorage.getItem(fallbackKey) || 'null'));
  } catch {
    return emptyState;
  }
}

function saveFallbackState(state: PersistedState): void {
  try {
    localStorage.setItem(compressedFallbackKey, compressToUTF16(JSON.stringify(state)));
    localStorage.removeItem(fallbackKey);
  } catch {
    // IndexedDB remains the primary store; localStorage is only a best-effort fallback.
  }
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
  try {
    const database = await db();
    const value = await database.get(storeName, stateKey);
    return normalizePersistedState(value);
  } catch {
    return loadFallbackState();
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  saveFallbackState(state);
  try {
    const database = await db();
    await database.put(storeName, state, stateKey);
  } catch {
    // Keep current in-memory data and the fallback copy instead of surfacing a stale load error.
  }
}

export async function clearPersistedState(): Promise<void> {
  localStorage.removeItem(fallbackKey);
  localStorage.removeItem(compressedFallbackKey);
  try {
    const database = await db();
    await database.delete(storeName, stateKey);
  } catch {
    // Nothing else to clear.
  }
}
