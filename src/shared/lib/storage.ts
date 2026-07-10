import { openDB } from 'idb';
import type { PersistedState } from '../types/domain';

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

export async function loadPersistedState(): Promise<PersistedState> {
  const database = await db();
  const value = await database.get(storeName, stateKey);
  if (!value) return emptyState;
  return {
    ...emptyState,
    ...value,
    rows: (value.rows ?? []).map((row: any) => ({ ...row, parsedAt: row.parsedAt ? new Date(row.parsedAt) : null })),
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
