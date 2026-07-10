import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { classifyAgentGroup, getBotDisplayName } from '../bots/botDictionary';
import { normalizeColumnName, normalizeRecord, requiredColumns } from './columnMapping';
import { getSectionAndPageType, normalizePath } from '../../shared/lib/url';
import type { LogRow, ParsedLogResult } from '../../shared/types/domain';

type CsvRecord = Record<string, unknown>;

function parseCount(raw: string | undefined): number {
  const count = Number(raw || 1);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
}

function parseDate(raw: string): { parsedAt: Date | null; date: string; hour: number | null; minute: number | null } {
  const text = raw.trim();
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      parsedAt: parsed,
      date: parsed.toISOString().slice(0, 10),
      hour: parsed.getHours(),
      minute: parsed.getMinutes(),
    };
  }
  const match = text.match(/(\d{4})[-./](\d{2})[-./](\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!match) return { parsedAt: null, date: 'Unknown', hour: null, minute: null };
  const [, y, m, d, hh, mm] = match;
  const date = `${y}-${m}-${d}`;
  return { parsedAt: null, date, hour: hh ? Number(hh) : null, minute: mm ? Number(mm) : null };
}

export function toLogRow(rawRecord: CsvRecord, copyIndex = 0): LogRow {
  const record = normalizeRecord(rawRecord);
  const datetimeRaw = record.datetime ?? '';
  const parsed = parseDate(datetimeRaw);
  const path = normalizePath(record.path ?? '/');
  const page = getSectionAndPageType(path);
  const ua = record.http_user_agent ?? '';
  const botType = record.bot_type || getBotDisplayName('', ua);
  const uaGroup = record.ua_group;
  const uniqId = record.uniq_id || [record.sid, datetimeRaw, path, botType, copyIndex].filter(Boolean).join('|');

  return {
    sid: record.sid,
    datetimeRaw,
    ...parsed,
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
  const record = normalizeRecord(rawRecord);
  return Array.from({ length: parseCount(record.count) }, (_, index) => toLogRow(record, index));
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
    rowCount: rows.length,
    detectedColumns: fields.map(normalizeColumnName),
    usedUaGroupColumn: fields.map(normalizeColumnName).includes('ua_group'),
  };
}

export async function parseCsvFile(file: File): Promise<ParsedLogResult> {
  return parseCsvText(await file.text());
}

function isRealXlsx(buffer: ArrayBuffer): boolean {
  const signature = new Uint8Array(buffer.slice(0, 4));
  return signature[0] === 0x50 && signature[1] === 0x4b && signature[2] === 0x03 && signature[3] === 0x04;
}

function sheetRowsToCsvLines(sheet: XLSX.WorkSheet): string[] {
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
  return matrix
    .map((row) => row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join(','))
    .filter(Boolean);
}

export async function parseExcelWrappedCsv(file: File): Promise<ParsedLogResult> {
  const buffer = await file.arrayBuffer();
  if (!isRealXlsx(buffer)) return parseCsvText(await file.text());

  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('XLSX-файл не содержит листов.');
  const sheet = workbook.Sheets[sheetName];
  const a1 = String(sheet.A1?.v ?? '');
  if (!a1.includes('datetime') && !a1.includes('sid,')) {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return parseCsvText(csv);
  }
  return parseCsvText(sheetRowsToCsvLines(sheet).join('\n'));
}

export async function parseLogFile(file: File): Promise<ParsedLogResult> {
  return /\.xlsx?$/i.test(file.name) ? parseExcelWrappedCsv(file) : parseCsvFile(file);
}
