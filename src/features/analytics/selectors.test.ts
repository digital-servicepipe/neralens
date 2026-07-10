import { describe, expect, it } from 'vitest';
import { classifyAgentGroup } from '../bots/botDictionary';
import { buildKpis, filterRows } from './selectors';
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
});
