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
  });
});
