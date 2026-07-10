import { describe, expect, it } from 'vitest';
import { classifyAgentGroup } from '../bots/botDictionary';
import { buildFilterOptions, buildKpis, filterRows, refineSections } from './selectors';
import type { LogRow } from '../../shared/types/domain';

const row: LogRow = {
  datetimeRaw: '2026-07-09T09:00:00Z',
  parsedAt: new Date('2026-07-09T09:00:00Z'),
  date: '2026-07-09',
  hour: 9,
  minute: 0,
  httpUserAgent: 'OAI-SearchBot/1.0',
  uniqId: '1',
  path: '/private/page',
  country: 'RU',
  asn: 'AS1',
  subnet: '10.0.0.0/24',
  netname: 'OpenAI',
  requestStatus: 'passed',
  botType: 'OAI-SearchBot',
  agentGroup: 'ai_bot_search_crawler',
  section: '/private',
  pageType: 'other',
};

describe('analytics selectors', () => {
  it('classifies bot group by signature', () => {
    expect(classifyAgentGroup(undefined, 'OAI-SearchBot', 'OAI-SearchBot/1.0')).toBe('ai_bot_search_crawler');
  });

  it('filters rows and computes KPI', () => {
    expect(filterRows([row], { dateFrom: '2026-07-01', dateTo: '2026-07-31', agentGroups: ['ai_bot_search_crawler'], agentDetails: [], requestStatuses: [], sections: [], countries: [], pathQuery: 'private' })).toHaveLength(1);
    expect(buildKpis([row], 'User-agent: OAI-SearchBot\nDisallow: /private').blockedHits).toBe(1);
  });

  it('accepts partial filters restored from older URL state', () => {
    expect(filterRows([row], { agentGroups: ['ai_bot_search_crawler'] })).toHaveLength(1);
  });

  it('groups Servicepipe paths into product site sections', () => {
    const rows = refineSections([
      { ...row, path: '/', section: '/' },
      { ...row, path: '/blog/waf-or-bot-protection', section: '/blog' },
      { ...row, path: '/press-center/example', section: '/press-center' },
      { ...row, path: '/dosgate/autopilot', section: '/dosgate' },
      { ...row, path: '/finance', section: '/finance' },
      { ...row, path: '/about', section: '/about' },
      { ...row, path: '/unknown-page', section: '/unknown-page' },
      { ...row, path: '/xpvnsulc/captcha_image.php', section: '/xpvnsulc' },
    ]);

    expect(rows.map((item) => item.section)).toEqual(['Главная страница', 'Блог', 'СМИ о нас', 'Продуктовые', 'Решения', 'Компания', 'Другое', 'Технические']);
    expect(buildFilterOptions(rows).sections).toEqual(['Блог', 'СМИ о нас', 'Главная страница', 'Продуктовые', 'Решения', 'Компания', 'Технические', 'Другое']);
    expect(filterRows(rows, { sections: ['/blog'] })[0].section).toBe('Блог');
    expect(filterRows(rows, { sections: ['Продуктовые'] })[0].path).toBe('/dosgate/autopilot');
    expect(filterRows(rows, { sections: ['Компания'] }).map((item) => item.path)).toEqual(['/about']);
  });
});
