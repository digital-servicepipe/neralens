import { describe, expect, it } from 'vitest';
import { parseIndustryText } from './industryParser';

describe('industryParser', () => {
  it('parses industry attack metrics from csv text', async () => {
    const result = await parseIndustryText([
      'industry,date,all_trafic,bad_bots_percent,good_bots_percent,humans_percent,bots_percent,strong_bots_percent,mobile_bots_percent,desktop_bots_percent,unknown_bots_percent,data_centers_percent,api_percent,ru_percent,foreign_percent,parsers_percent,creds_percent,scaner_percent,payments_crack_percent,sms_push_bomber_percent',
      'Banking,2026-07-01,638251940,"1,88",6.78,89.43,25.79,74.21,1.92,50.31,47.77,9.79,2.54,88.45,11.55,3.21,0.23,7.94,0.94,0.08',
    ].join('\n'));

    expect(result.rowCount).toBe(1);
    expect(result.rows[0]).toMatchObject({
      industry: 'Banking',
      date: '2026-07-01',
      allTrafic: 638251940,
      badBotsPercent: 1.88,
      scanerPercent: 7.94,
    });
    expect(result.rows[0].checkPercent).toBeCloseTo(1.91, 10);
  });

  it('uses an explicit check category when the export provides it', async () => {
    const result = await parseIndustryText([
      'industry,date,all_trafic,bad_bots_percent,good_bots_percent,humans_percent,check_percent,bots_percent,strong_bots_percent,mobile_bots_percent,desktop_bots_percent,unknown_bots_percent,data_centers_percent,api_percent,ru_percent,foreign_percent,parsers_percent,creds_percent,scaner_percent,payments_crack_percent,sms_push_bomber_percent',
      'Banking,2026-07-01,1000,10,10,70,10,25,75,2,50,48,10,2,88,12,3,0.2,8,1,0.1',
    ].join('\n'));

    expect(result.rows[0].checkPercent).toBe(10);
  });

  it('rejects missing metrics instead of inventing zeroes', async () => {
    await expect(parseIndustryText([
      'industry,date,all_trafic,bad_bots_percent',
      'Banking,2026-07-01,1000,2.5',
    ].join('\n'))).rejects.toThrow('Не хватает колонок');
  });

  it('rejects invalid percentages with the source row number', async () => {
    const header = 'industry,date,all_trafic,bad_bots_percent,good_bots_percent,humans_percent,bots_percent,strong_bots_percent,mobile_bots_percent,desktop_bots_percent,unknown_bots_percent,data_centers_percent,api_percent,ru_percent,foreign_percent,parsers_percent,creds_percent,scaner_percent,payments_crack_percent,sms_push_bomber_percent';
    await expect(parseIndustryText([
      header,
      'Banking,2026-07-01,1000,101,6,90,25,75,2,50,48,10,2,88,12,3,0.2,8,1,0.1',
    ].join('\n'))).rejects.toThrow('Строка 2: bad_bots_percent');
  });

  it('rejects inconsistent 100-percent compositions instead of normalizing them', async () => {
    const header = 'industry,date,all_trafic,bad_bots_percent,good_bots_percent,humans_percent,bots_percent,strong_bots_percent,mobile_bots_percent,desktop_bots_percent,unknown_bots_percent,data_centers_percent,api_percent,ru_percent,foreign_percent,parsers_percent,creds_percent,scaner_percent,payments_crack_percent,sms_push_bomber_percent';
    await expect(parseIndustryText([
      header,
      'Banking,2026-07-01,1000,2,6,90,25,70,2,50,48,10,2,88,12,3,0.2,8,1,0.1',
    ].join('\n'))).rejects.toThrow('bots_percent + strong_bots_percent должны составлять 100%');
  });
});
