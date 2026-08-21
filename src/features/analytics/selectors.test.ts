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

  it('keeps singleton pages out of sections and groups technical/file rows', () => {
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
      { ...row, path: '/settings.json', section: '/settings.json' },
      { ...row, path: '/settings.py', section: '/settings.py' },
      { ...row, path: '/serviceaccountkey.json', section: '/serviceaccountkey.json' },
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
      '/settings.json',
      '/settings.py',
      '/serviceaccountkey.json',
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
      '',
      '',
      '',
      '',
      '',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Файлы',
      'Файлы',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'Технические',
      'PDF',
    ]);
    expect(buildFilterOptions(rows).sections).toEqual(['/', 'Технические', 'PDF', 'Файлы', '/blog', '/docs']);
    expect(filterRows(rows, { sections: ['/blog'] })).toHaveLength(3);
    expect(filterRows(rows, { sections: ['/docs'] }).map((item) => item.path)).toEqual(['/docs/intro', '/docs/api/auth', '/docs/api/rate-limits']);
    expect(filterRows(rows, { sections: ['/pricing'] })).toHaveLength(0);
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
      '/settings.json',
      '/settings.py',
      '/serviceaccountkey.json',
      '/manifest.json',
      '/secrets.json',
      '/.aws/credentials',
      '/application.yml',
      '/keyfile',
      '/.cursor/mcp.json',
      '/account.json',
    ]);
    expect(filterRows(rows, { sections: ['Files'] }).map((item) => item.path)).toEqual(['/assets/app.js', '/assets/site.css']);
    expect(filterRows(rows, { sections: ['Технические'] }).map((item) => item.path)).toHaveLength(26);
    expect(filterRows(rows, { sections: ['Файлы'] }).map((item) => item.path)).toEqual(['/assets/app.js', '/assets/site.css']);
    expect(filterRows(rows, { sections: ['PDF'] }).map((item) => item.path)).toEqual(['/docs/report.pdf']);
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

  it('uses manual Servicepipe sections when Servicepipe logs mode is enabled', () => {
    const rows = refineSections([
      { ...row, path: '/blog/waf-or-bot-protection', section: '/blog' },
      { ...row, path: '/press-center/company-update', section: '/press-center' },
      { ...row, path: '/news/company-update', section: '/news' },
      { ...row, path: '/antibot', section: '/antibot' },
      { ...row, path: '/visibla/scan', section: '/visibla' },
      { ...row, path: '/telecom/security-direct-connect', section: '/telecom' },
      { ...row, path: '/finance', section: '/finance' },
      { ...row, path: '/contacts', section: '/contacts' },
      { ...row, path: '/partners/wmx', section: '/partners' },
      { ...row, path: '/@fs/src/main.ts', section: '/@fs' },
      { ...row, path: '/actuator/health', section: '/actuator' },
      { ...row, path: '/audit/logs', section: '/audit' },
      { ...row, path: '/aws/config', section: '/aws' },
      { ...row, path: '/network/status', section: '/network' },
      { ...row, path: '/stati/archive', section: '/stati' },
      { ...row, path: '/web/assets', section: '/web' },
      { ...row, path: '/random-singleton', section: '/random-singleton' },
    ], true);

    expect(rows.map((item) => item.section)).toEqual([
      'Блог',
      'Пресс-центр',
      'Новости',
      'Продуктовые страницы',
      'Продуктовые страницы',
      'Отраслевые страницы',
      'Отраслевые страницы',
      'Компания',
      'Партнёрам',
      'Прочее',
      'Прочее',
      'Прочее',
      'Прочее',
      'Прочее',
      'Прочее',
      'Прочее',
      '',
    ]);
    expect(buildFilterOptions(rows).sections).toEqual([
      'Блог',
      'Пресс-центр',
      'Новости',
      'Продуктовые страницы',
      'Отраслевые страницы',
      'Компания',
      'Партнёрам',
      'Прочее',
    ]);
    expect(filterRows(rows, { sections: ['Продуктовые страницы'] }).map((item) => item.path)).toEqual(['/antibot', '/visibla/scan']);
    expect(filterRows(rows, { sections: ['Отраслевые страницы'] }).map((item) => item.path)).toEqual(['/telecom/security-direct-connect', '/finance']);
    expect(filterRows(rows, { sections: ['Прочее'] }).map((item) => item.path)).toEqual([
      '/@fs/src/main.ts',
      '/actuator/health',
      '/audit/logs',
      '/aws/config',
      '/network/status',
      '/stati/archive',
      '/web/assets',
    ]);
  });

  it('keeps old section promotion when Servicepipe logs mode is disabled', () => {
    const rows = refineSections([
      { ...row, path: '/antibot', section: '/antibot' },
      { ...row, path: '/finance', section: '/finance' },
      { ...row, path: '/blog/one', section: '/blog' },
    ], false);

    expect(rows.map((item) => item.section)).toEqual(['', '', '']);
  });
});
