// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { disallowMatches, parseRobotsTxt, parseSitemapXml, pathMatchesDisallow } from './sitemapParser';

describe('sitemap and robots', () => {
  it('parses sitemap urls', () => {
    const urls = parseSitemapXml('<urlset><url><loc>https://example.com/catalog/item</loc><lastmod>2026-07-09</lastmod></url></urlset>');
    expect(urls[0].path).toBe('/catalog/item');
    expect(urls[0].group).toBe('catalog');
  });

  it('supports robots wildcard disallow', () => {
    expect(pathMatchesDisallow('/catalog/private/item', '/catalog/*/item')).toBe(true);
    const rules = parseRobotsTxt('User-agent: GPTBot\nDisallow: /private*\nCrawl-delay: 3\nSitemap: https://example.com/sitemap.xml');
    expect(rules).toHaveLength(3);
    expect(disallowMatches({ path: '/private/page', botType: 'GPTBot', httpUserAgent: 'GPTBot/1.0' }, rules)).toEqual(['GPTBot: /private*']);
  });
});
