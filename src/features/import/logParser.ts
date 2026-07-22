import Papa from 'papaparse';
import { classifyAgentGroup, getBotDisplayName } from '../bots/botDictionary';
import { normalizeColumnName, normalizeRecord, requiredColumns } from './columnMapping';
import { getSectionAndPageType, normalizePath } from '../../shared/lib/url';
import { parseLogDate } from '../../shared/lib/logDate';
import type { LogRow, ParsedLogResult } from '../../shared/types/domain';

type CsvRecord = Record<string, unknown>;

function parseCount(raw: string | undefined): number {
  const count = Number(raw || 1);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
}

export function toLogRow(rawRecord: CsvRecord, copyIndex = 0): LogRow {
  const record = normalizeRecord(rawRecord);
  const datetimeRaw = record.datetime ?? '';
  const dateRaw = record.date;
  const parsed = parseLogDate(datetimeRaw);
  const requestCount = parseCount(record.count);
  const path = normalizePath(record.path ?? '/');
  const page = getSectionAndPageType(path);
  const ua = record.http_user_agent ?? '';
  const botType = record.bot_type || getBotDisplayName('', ua);
  const uaGroup = record.ua_group;
  const uniqId = record.uniq_id || [record.sid, datetimeRaw, path, botType, copyIndex].filter(Boolean).join('|');

  return {
    sid: record.sid,
    datetimeRaw,
    dateRaw,
    ...parsed,
    requestCount,
    httpUserAgent: ua,
    uniqId,
    path,
    country: record.cresp_country ?? '',
    asn: record.cresp_asn ?? '',
    subnet: record.cresp_subnet ?? '',
    netname: record.cresp_netname ?? '',
    requestStatus: record.action ?? '',
    botType,
    agentGroup: classifyAgentGroup(uaGroup, botType, ua),
    host: record.host,
    sslsignName: record.sslsign_name,
    uaGroup,
    section: page.section,
    pageType: page.pageType,
  };
}

function expandRecord(rawRecord: CsvRecord): LogRow[] {
  return [toLogRow(rawRecord)];
}

function validate(fields: string[], records: CsvRecord[]): void {
  const normalizedFields = fields.map(normalizeColumnName);
  const missing = requiredColumns.filter((column) => !normalizedFields.includes(column));
  if (!normalizedFields.length || !records.length) {
    throw new Error('Файл пустой или в нём нет строк с данными.');
  }
  if (missing.length) {
    throw new Error(`Файл загружен, но структура не подходит. Не хватает колонок: ${missing.join(', ')}.`);
  }
}

export async function parseCsvText(text: string): Promise<ParsedLogResult> {
  const result = Papa.parse<CsvRecord>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeColumnName,
  });
  if (result.errors.length) {
    throw new Error('Не удалось распознать структуру CSV. Загрузите исходную выгрузку логов с заголовками колонок.');
  }
  const fields = result.meta.fields ?? [];
  validate(fields, result.data);
  const rows = result.data.flatMap(expandRecord);
  return {
    rows,
    rowCount: rows.reduce((sum, row) => sum + (row.requestCount ?? 1), 0),
    detectedColumns: fields.map(normalizeColumnName),
    usedUaGroupColumn: fields.map(normalizeColumnName).includes('ua_group'),
  };
}

export async function parseCsvFile(file: File): Promise<ParsedLogResult> {
  return parseCsvText(await file.text());
}

export async function parseLogFile(file: File): Promise<ParsedLogResult> {
  if (/\.xlsx?$/i.test(file.name)) {
    throw new Error('Загрузите логи в CSV. XLS/XLSX отключены, чтобы не тянуть небезопасный парсер в браузер.');
  }
  return parseCsvFile(file);
}
