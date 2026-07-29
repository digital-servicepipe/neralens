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

  it('keeps URL sections as paths and makes files/technical rows excludable', () => {
    const rows = refineSections([
      { ...row, path: '/', section: '/' },
      { ...row, path: '/blog/waf-or-bot-protection', section: '/blog' },
      { ...row, path: '/blog/ai-crawlers', section: '/blog' },
      { ...row, path: '/blog/llm-bots', section: '/blog' },
      { ...row, path: '/docs/intro', section: '/docs' },
      { ...row, path: '/docs/api/auth', section: '/docs' },
      { ...row, path: '/docs/api/rate-limits', section: '/docs' },
      { ...row, path: '/finance', section: '/finance' },
      { ...row, path: '/about', section: '/about' },
      { ...row, path: '/unknown-page', section: '/unknown-page' },
      { ...row, path: '/search%3Fs=search-word%26utm_source=bot', section: '/search' },
      { ...row, path: '/pricing', requestCount: 12, section: '/pricing' },
      { ...row, path: '/xpvnsulc/captcha_image.php', section: '/xpvnsulc' },
      { ...row, path: '/app_dev.php', section: '/app_dev.php' },
      { ...row, path: '/app_dev.php/_profiler', section: '/app_dev.php' },
      { ...row, path: '/captcha_image.php', section: '/captcha_image.php' },
      { ...row, path: '/config', section: '/config' },
      { ...row, path: '/graphql', section: '/graphql' },
      { ...row, path: '/server-info', section: '/server-info' },
      { ...row, path: '/.env', section: '/.env' },
      { ...row, path: '/.bash_history', section: '/.bash_history' },
      { ...row, path: '/secrets', section: '/secrets' },
      { ...row, path: '/.git/HEAD', section: '/.git' },
      { ...row, path: '/config.json', section: '/config.json' },
      { ...row, path: '/static/jsrsasign-all-min.js.map', section: '/static' },
      { ...row, path: '/ssl/localhost.key', section: '/ssl' },
      { ...row, path: '/ngsw.json', section: '/ngsw.json' },
      { ...row, path: '/debug/pprof/cmdline', section: '/debug' },
      { ...row, path: '/assets/app.js', section: '/assets' },
      { ...row, path: '/assets/site.css', section: '/assets' },
      { ...row, path: 'https://servicepipe.ru/manifest.json', section: '/manifest.json' },
      { ...row, path: 'https://servicepipe.ru/secrets.json', section: '/secrets.json' },
      { ...row, path: 'https://servicepipe.ru/.aws/credentials', section: '/.aws' },
      { ...row, path: 'https://servicepipe.ru/application.yml', section: '/application.yml' },
      { ...row, path: 'https://servicepipe.ru/keyfile', section: '/keyfile' },
      { ...row, path: 'https://servicepipe.ru/.cursor/mcp.json', section: '/.cursor' },
      { ...row, path: 'https://servicepipe.ru/account.json', section: '/account.json' },
      { ...row, path: '/docs/report.pdf', section: '/docs' },
    ]);

    expect(rows.map((item) => item.path)).toEqual([
      '/',
      '/blog/waf-or-bot-protection',
      '/blog/ai-crawlers',
      '/blog/llm-bots',
      '/docs/intro',
      '/docs/api/auth',
      '/docs/api/rate-limits',
      '/finance',
      '/about',
      '/unknown-page',
      '/search',
      '/pricing',
      '/xpvnsulc/captcha_image.php',
      '/app_dev.php',
      '/app_dev.php/_profiler',
      '/captcha_image.php',
      '/config',
      '/graphql',
      '/server-info',
      '/.env',
      '/.bash_history',
      '/secrets',
      '/.git/HEAD',
      '/config.json',
      '/static/jsrsasign-all-min.js.map',
      '/ssl/localhost.key',
      '/ngsw.json',
      '/debug/pprof/cmdline',
      '/assets/app.js',
      '/assets/site.css',
      '/manifest.json',
      '/secrets.json',
      '/.aws/credentials',
      '/application.yml',
      '/keyfile',
      '/.cursor/mcp.json',
      '/account.json',
      '/docs/report.pdf',
    ]);
    expect(rows.map((item) => item.section)).toEqual([
      '/',
      '/blog',
      '/blog',
      '/blog',
      '/docs',
      '/docs',
      '/docs',
      '/finance',
      '/about',
      '/unknown-page',
      '/search',
      '/pricing',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Files',
      'Files',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'Technical',
      'PDF',
    ]);
    expect(buildFilterOptions(rows).sections).toEqual(['/', 'Technical', 'PDF', 'Files', '/about', '/blog', '/docs', '/finance', '/pricing', '/search', '/unknown-page']);
    expect(filterRows(rows, { sections: ['/blog'] })).toHaveLength(3);
    expect(filterRows(rows, { sections: ['/docs'] }).map((item) => item.path)).toEqual(['/docs/intro', '/docs/api/auth', '/docs/api/rate-limits']);
    expect(filterRows(rows, { sections: ['/pricing'] }).map((item) => item.path)).toEqual(['/pricing']);
    expect(filterRows(rows, { sections: ['PDF'] }).map((item) => item.path)).toEqual(['/docs/report.pdf']);
    expect(filterRows(rows, { sections: ['Files'] }).map((item) => item.path)).toEqual(['/assets/app.js', '/assets/site.css']);
    expect(filterRows(rows, { sections: ['Technical'] }).map((item) => item.path)).toEqual([
      '/xpvnsulc/captcha_image.php',
      '/app_dev.php',
      '/app_dev.php/_profiler',
      '/captcha_image.php',
      '/config',
      '/graphql',
      '/server-info',
      '/.env',
      '/.bash_history',
      '/secrets',
      '/.git/HEAD',
      '/config.json',
      '/static/jsrsasign-all-min.js.map',
      '/ssl/localhost.key',
      '/ngsw.json',
      '/debug/pprof/cmdline',
      '/manifest.json',
      '/secrets.json',
      '/.aws/credentials',
      '/application.yml',
      '/keyfile',
      '/.cursor/mcp.json',
      '/account.json',
    ]);
    expect(filterRows(rows, { excludedSections: ['Technical', 'PDF', 'Files'] }).map((item) => item.path)).toEqual([
      '/',
      '/blog/waf-or-bot-protection',
      '/blog/ai-crawlers',
      '/blog/llm-bots',
      '/docs/intro',
      '/docs/api/auth',
      '/docs/api/rate-limits',
      '/finance',
      '/about',
      '/unknown-page',
      '/search',
      '/pricing',
    ]);
  });
});
