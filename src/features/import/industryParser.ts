import Papa from 'papaparse';
import type { IndustryRow, ParsedIndustryResult } from '../../shared/types/domain';

type CsvRecord = Record<string, unknown>;

const columnAliases: Record<string, keyof IndustryRow> = {
  industry: 'industry',
  date: 'date',
  all_trafic: 'allTrafic',
  bad_bots_percent: 'badBotsPercent',
  good_bots_percent: 'goodBotsPercent',
  humans_percent: 'humansPercent',
  bots_percent: 'botsPercent',
  strong_bots_percent: 'strongBotsPercent',
  mobile_bots_percent: 'mobileBotsPercent',
  desktop_bots_percent: 'desktopBotsPercent',
  unknown_bots_percent: 'unknownBotsPercent',
  data_centers_percent: 'dataCentersPercent',
  api_percent: 'apiPercent',
  ru_percent: 'ruPercent',
  foreign_percent: 'foreignPercent',
  parsers_percent: 'parsersPercent',
  creds_percent: 'credsPercent',
  scaner_percent: 'scanerPercent',
  scanner_percent: 'scanerPercent',
  payments_crack_percent: 'paymentsCrackPercent',
  sms_push_bomber_percent: 'smsPushBomberPercent',
};

const percentColumns = [
  'badBotsPercent', 'goodBotsPercent', 'humansPercent', 'botsPercent', 'strongBotsPercent',
  'mobileBotsPercent', 'desktopBotsPercent', 'unknownBotsPercent', 'dataCentersPercent',
  'apiPercent', 'ruPercent', 'foreignPercent', 'parsersPercent', 'credsPercent',
  'scanerPercent', 'paymentsCrackPercent', 'smsPushBomberPercent',
] as const satisfies readonly (keyof IndustryRow)[];

const requiredColumns = ['industry', 'date', 'allTrafic', ...percentColumns] as const;
const compositionTolerance = 0.11;

function normalizeColumnName(column: string): string {
  return column.trim().replace(/^\uFEFF/, '').toLowerCase();
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') return value;
  const normalized = String(value ?? '').trim().replace(/\s+/g, '').replace('%', '').replace(',', '.');
  if (!normalized) return Number.NaN;
  const parsed = Number(normalized);
  return parsed;
}

function stringValue(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeDate(value: unknown): string {
  const raw = stringValue(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return raw || 'Unknown';
}

function toIndustryRow(record: CsvRecord): IndustryRow {
  const normalized = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [columnAliases[normalizeColumnName(key)] ?? normalizeColumnName(key), value]),
  ) as Record<keyof IndustryRow, unknown>;

  return {
    industry: stringValue(normalized.industry) || 'Неизвестно',
    date: normalizeDate(normalized.date),
    allTrafic: numberValue(normalized.allTrafic),
    badBotsPercent: numberValue(normalized.badBotsPercent),
    goodBotsPercent: numberValue(normalized.goodBotsPercent),
    humansPercent: numberValue(normalized.humansPercent),
    botsPercent: numberValue(normalized.botsPercent),
    strongBotsPercent: numberValue(normalized.strongBotsPercent),
    mobileBotsPercent: numberValue(normalized.mobileBotsPercent),
    desktopBotsPercent: numberValue(normalized.desktopBotsPercent),
    unknownBotsPercent: numberValue(normalized.unknownBotsPercent),
    dataCentersPercent: numberValue(normalized.dataCentersPercent),
    apiPercent: numberValue(normalized.apiPercent),
    ruPercent: numberValue(normalized.ruPercent),
    foreignPercent: numberValue(normalized.foreignPercent),
    parsersPercent: numberValue(normalized.parsersPercent),
    credsPercent: numberValue(normalized.credsPercent),
    scanerPercent: numberValue(normalized.scanerPercent),
    paymentsCrackPercent: numberValue(normalized.paymentsCrackPercent),
    smsPushBomberPercent: numberValue(normalized.smsPushBomberPercent),
  };
}

function validate(fields: string[], records: CsvRecord[]): void {
  const canonicalFields = fields.map((field) => columnAliases[normalizeColumnName(field)] ?? normalizeColumnName(field));
  const missing = requiredColumns.filter((column) => !canonicalFields.includes(column));
  if (!canonicalFields.length || !records.length) {
    throw new Error('Файл пустой или в нём нет строк с отраслевыми данными.');
  }
  if (missing.length) {
    const sourceNames = missing.map((column) => Object.entries(columnAliases).find(([, key]) => key === column)?.[0] ?? column);
    throw new Error(`Файл загружен, но структура не подходит для достоверной отраслевой аналитики. Не хватает колонок: ${sourceNames.join(', ')}.`);
  }
}

function validateRow(row: IndustryRow, rowNumber: number): void {
  if (!row.industry || row.industry === 'Неизвестно') throw new Error(`Строка ${rowNumber}: не указана отрасль.`);
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? Date.parse(`${row.date}T00:00:00Z`) : Number.NaN;
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== row.date) {
    throw new Error(`Строка ${rowNumber}: некорректная дата «${row.date}».`);
  }
  if (!Number.isFinite(row.allTrafic) || row.allTrafic <= 0) {
    throw new Error(`Строка ${rowNumber}: all_trafic должен быть положительным числом.`);
  }
  for (const key of percentColumns) {
    const value = row[key];
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      const sourceName = Object.entries(columnAliases).find(([, target]) => target === key)?.[0] ?? key;
      throw new Error(`Строка ${rowNumber}: ${sourceName} должен быть числом от 0 до 100.`);
    }
  }

  validateComposition(rowNumber, 'bots_percent + strong_bots_percent', row.botsPercent + row.strongBotsPercent);
  validateComposition(
    rowNumber,
    'mobile_bots_percent + desktop_bots_percent + unknown_bots_percent',
    row.mobileBotsPercent + row.desktopBotsPercent + row.unknownBotsPercent,
  );
  validateComposition(rowNumber, 'ru_percent + foreign_percent', row.ruPercent + row.foreignPercent);
}

function validateComposition(rowNumber: number, label: string, sum: number): void {
  if (Math.abs(sum - 100) <= compositionTolerance) return;
  throw new Error(`Строка ${rowNumber}: ${label} должны составлять 100%, сейчас ${sum}%. Данные не нормализованы автоматически.`);
}

export async function parseIndustryText(text: string): Promise<ParsedIndustryResult> {
  const result = Papa.parse<CsvRecord>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeColumnName,
  });
  if (result.errors.length) {
    throw new Error('Не удалось распознать отраслевой CSV/TSV. Проверьте заголовки колонок и разделитель.');
  }
  const fields = result.meta.fields ?? [];
  validate(fields, result.data);
  const rows = result.data.map((record, index) => {
    const row = toIndustryRow(record);
    validateRow(row, index + 2);
    return row;
  });
  return { rows, rowCount: rows.length, detectedColumns: fields.map(normalizeColumnName) };
}

export async function parseIndustryFile(file: File): Promise<ParsedIndustryResult> {
  if (/\.xlsx?$/i.test(file.name)) {
    throw new Error('Загрузите отраслевой файл в CSV или TSV. XLS/XLSX сейчас не читаются в браузере.');
  }
  return parseIndustryText(await file.text());
}
