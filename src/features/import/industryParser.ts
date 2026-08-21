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

const requiredColumns = ['industry', 'date', 'all_trafic'] as const;

function normalizeColumnName(column: string): string {
  return column.trim().replace(/^\uFEFF/, '').toLowerCase();
}

function numberValue(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const normalizedFields = fields.map(normalizeColumnName);
  const missing = requiredColumns.filter((column) => !normalizedFields.includes(column));
  if (!normalizedFields.length || !records.length) {
    throw new Error('Файл пустой или в нём нет строк с отраслевыми данными.');
  }
  if (missing.length) {
    throw new Error(`Файл загружен, но структура не подходит для отраслевой аналитики. Не хватает колонок: ${missing.join(', ')}.`);
  }
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
  const rows = result.data.map(toIndustryRow).filter((row) => row.industry && row.allTrafic > 0);
  if (!rows.length) throw new Error('В файле нет строк с положительным значением all_trafic.');
  return { rows, rowCount: rows.length, detectedColumns: fields.map(normalizeColumnName) };
}

export async function parseIndustryFile(file: File): Promise<ParsedIndustryResult> {
  if (/\.xlsx?$/i.test(file.name)) {
    throw new Error('Загрузите отраслевой файл в CSV или TSV. XLS/XLSX сейчас не читаются в браузере.');
  }
  return parseIndustryText(await file.text());
}
