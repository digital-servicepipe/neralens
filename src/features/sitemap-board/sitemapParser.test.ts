// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { disallowMatches, parseRobotsTxt, parseSitemapXml, pathMatchesDisallow } from './sitemapParser';
import { buildPageTitleCatalog, displayTitleForPath } from '../../shared/lib/pageTitles';

describe('sitemap and robots', () => {
  it('parses sitemap urls', () => {
    const urls = parseSitemapXml('<urlset><url><loc>https://example.com/catalog/item</loc><lastmod>2026-07-09</lastmod></url></urlset>');
    expect(urls[0].path).toBe('/catalog/item');
    expect(urls[0].group).toBe('catalog');
  });

  it('uses json metadata as readable page titles', () => {
    const files = [
      {
        name: 'sitemap-blog.xml',
        content: '<urlset><url><loc>https://servicepipe.ru/blog/bad-bot-scanner-for-free</loc></url></urlset>',
      },
      {
        name: 'articles.json',
        content: JSON.stringify({
          data: [{ url: 'bad-bot-scanner-for-free', metaTitle: 'Как проверить сайт на ботов | Блог Servicepipe' }],
        }),
      },
    ];
    const catalog = buildPageTitleCatalog(files);
    const urls = parseSitemapXml(files[0].content, catalog);

    expect(urls[0].title).toBe('Как проверить сайт на ботов');
    expect(displayTitleForPath('/blog/bad-bot-scanner-for-free', catalog)).toBe('Как проверить сайт на ботов');
  });

  it('maps news metadata to press-center and news urls', () => {
    const catalog = buildPageTitleCatalog([
      {
        name: 'news.json',
        content: JSON.stringify({
          data: [{ url: 'flowcollector-press-release', metaTitle: 'FlowCollector для операторов связи | Servicepipe' }],
        }),
      },
    ]);

    expect(displayTitleForPath('/press-center/flowcollector-press-release', catalog)).toBe('FlowCollector для операторов связи');
    expect(displayTitleForPath('/news/flowcollector-press-release', catalog)).toBe('FlowCollector для операторов связи');
  });

  it('uses bundled Servicepipe titles when json files are not loaded', () => {
    const catalog = buildPageTitleCatalog();

    expect(displayTitleForPath('/blog/behavioral-factors-cheating', catalog)).toBe('Защита от накрутки ПФ');
    expect(displayTitleForPath('/press-center/rossiyskiye_banki_fiksiruyut_rost_kiberatak_s_ii', catalog)).toBe('Российские банки фиксируют рост кибератак с использованием ИИ');
  });

  it('has readable titles for main sitemap pages', () => {
    const catalog = buildPageTitleCatalog();

    expect(displayTitleForPath('/finance', catalog)).toBe('Высокоточная защита финансовых сервисов от кибератак и регуляторных рисков');
    expect(displayTitleForPath('/dosgate/autopilot', catalog)).toBe('DosGate Autopilot');
  });

  it('supports robots wildcard disallow', () => {
    expect(pathMatchesDisallow('/catalog/private/item', '/catalog/*/item')).toBe(true);
    const rules = parseRobotsTxt('User-agent: GPTBot\nDisallow: /private*\nCrawl-delay: 3\nSitemap: https://example.com/sitemap.xml');
    expect(rules).toHaveLength(3);
    expect(disallowMatches({ path: '/private/page', botType: 'GPTBot', httpUserAgent: 'GPTBot/1.0' }, rules)).toEqual(['GPTBot: /private*']);
  });
});
