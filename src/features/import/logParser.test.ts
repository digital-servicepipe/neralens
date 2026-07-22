import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { normalizeColumnName } from './columnMapping';
import { parseCsvText, parseExcelWrappedCsv } from './logParser';

const csv = [
  'sid,datetime_utc,ua,uniq_id,url,country,asn,subnet,netname,status,bot,uaGroup',
  '1,2026-07-09T09:00:00Z,GPTBot/1.0,u1,/catalog/item,RU,AS1,10.0.0.0/24,OpenAI,passed,GPTBot,ai_data_scraper_bot',
].join('\n');

const newCsv = [
  '"sid","datetime","date","ua","path","country","asn","subnet","netname","action","host","sslsign_name","ua_group","count"',
  '10007,2026-05-30 21:00:00,2026-05-30,"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",/press-center/page,US,8075,"23.96.0.0/14",Microsoft Corporation,pass,servicepipe.ru,ai_assistant_ChatGPT_User_human,assistants,3',
  '10007,2026-05-30 21:00:00,2026-05-30,"Mozilla/5.0 (Applebot/0.1; +http://www.apple.com/go/applebot)",/robots.txt,US,714,"17.240.0.0/13",Apple Inc.,pass,servicepipe.ru,safari[16-18]_ios_http20,search_crawlers,2',
].join('\n');

const minimalCsv = [
  'datetime,http_user_agent,uniq_id,path,cresp_country,cresp_asn,cresp_subnet,bot_type',
  '2026-05-25 19:30:48.888000000,"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",mUm4wuUGceA1,/press-center/zashhita-veb-prilozhenij,US,8075,23.96.0.0/14,ChatGPT-User',
].join('\n');

describe('log import', () => {
  it('normalizes aliases', () => {
    expect(normalizeColumnName('ua')).toBe('http_user_agent');
    expect(normalizeColumnName('request_path')).toBe('path');
    expect(normalizeColumnName('provider')).toBe('cresp_netname');
  });

  it('parses csv rows', async () => {
    const parsed = await parseCsvText(csv);
    expect(parsed.rowCount).toBe(1);
    expect(parsed.rows[0].path).toBe('/catalog/item');
    expect(parsed.rows[0].agentGroup).toBe('ai_data_scraper_bot');
  });

  it('parses aggregated csv rows without uniq_id and bot_type', async () => {
    const parsed = await parseCsvText(newCsv);
    expect(parsed.rowCount).toBe(5);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].requestCount).toBe(3);
    expect(parsed.rows[0].uniqId).toContain('/press-center/page');
    expect(parsed.rows[0].botType).toBe('ChatGPT-User');
    expect(parsed.rows[0].agentGroup).toBe('ai_assistant_bot');
    expect(parsed.rows[1].agentGroup).toBe('ai_bot_search_crawler');
    expect(parsed.rows[1].host).toBe('servicepipe.ru');
  });

  it('keeps explicit log calendar date for midnight rows', async () => {
    const parsed = await parseCsvText([
      'datetime,http_user_agent,path,count',
      '2026-07-15 00:00:00,ClaudeBot/1.0,/robots.txt,2',
    ].join('\n'));

    expect(parsed.rowCount).toBe(2);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].requestCount).toBe(2);
    expect(parsed.rows.every((row) => row.date === '2026-07-15')).toBe(true);
    expect(parsed.rows[0].hour).toBe(0);
    expect(parsed.rows[0].minute).toBe(0);
  });

  it('uses datetime as the source of truth when date column differs', async () => {
    const parsed = await parseCsvText([
      'datetime,date,http_user_agent,path,count',
      '2026-06-30 00:00:00,2026-06-29,ClaudeBot/1.0,/robots.txt,1',
    ].join('\n'));

    expect(parsed.rows[0].datetimeRaw).toBe('2026-06-30 00:00:00');
    expect(parsed.rows[0].dateRaw).toBe('2026-06-29');
    expect(parsed.rows[0].date).toBe('2026-06-30');
    expect(parsed.rows[0].hour).toBe(0);
    expect(parsed.rows[0].minute).toBe(0);
  });

  it('parses minimal rows without netname and action', async () => {
    const parsed = await parseCsvText(minimalCsv);
    expect(parsed.rowCount).toBe(1);
    expect(parsed.rows[0].netname).toBe('');
    expect(parsed.rows[0].requestStatus).toBe('');
    expect(parsed.rows[0].botType).toBe('ChatGPT-User');
    expect(parsed.rows[0].agentGroup).toBe('ai_assistant_bot');
  });

  it('parses excel wrapped csv', async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(csv.split('\n').map((line) => [line]));
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const array = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const file = new File([array], 'media_processed.xlsx');
    const parsed = await parseExcelWrappedCsv(file);
    expect(parsed.rowCount).toBe(1);
    expect(parsed.detectedColumns).toContain('http_user_agent');
  });
});
