import type { LogRow, RobotsRule, SitemapUrl } from '../../shared/types/domain';
import { displayTitleForPath, type PageTitleCatalog } from '../../shared/lib/pageTitles';
import { normalizePath, normalizePathWithQuery, titleFromPath } from '../../shared/lib/url';

function textFrom(parent: Element, tag: string): string {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
}

export function parseSitemapXml(xml: string, titleCatalog?: PageTitleCatalog): SitemapUrl[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('url'))
    .map((urlNode) => {
      const url = textFrom(urlNode, 'loc');
      const path = normalizePath(url);
      return {
        url,
        path,
        title: titleCatalog ? displayTitleForPath(path, titleCatalog) : titleFromPath(path),
        group: path === '/' ? 'Главная' : path.split('/').filter(Boolean)[0] ?? 'Другое',
        depth: path === '/' ? 0 : path.split('/').filter(Boolean).length,
        lastmod: textFrom(urlNode, 'lastmod'),
        changefreq: textFrom(urlNode, 'changefreq'),
        priority: textFrom(urlNode, 'priority'),
      };
    })
    .filter((item) => item.url);
}

export function parseRobotsTxt(text: string): RobotsRule[] {
  const rules: RobotsRule[] = [];
  let agents: string[] = [];
  let hadDirective = false;
  text.split(/\r?\n/).forEach((line) => {
    const cleaned = line.replace(/#.*/, '').trim();
    if (!cleaned) return;
    const index = cleaned.indexOf(':');
    if (index === -1) return;
    const key = cleaned.slice(0, index).trim().toLowerCase();
    const value = cleaned.slice(index + 1).trim();
    if (key === 'user-agent') {
      if (hadDirective) {
        agents = [];
        hadDirective = false;
      }
      agents.push(value);
      return;
    }
    if (key === 'disallow' || key === 'crawl-delay') {
      hadDirective = true;
      agents.forEach((agent) => rules.push({ agent, directive: key, value }));
      return;
    }
    if (key === 'sitemap' || key === 'clean-param') rules.push({ agent: '*', directive: key, value });
  });
  return rules;
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

export function pathMatchesDisallow(path: string, rule: string): boolean {
  if (!rule) return false;
  if (rule === '/') return true;
  if (rule.includes('*')) return new RegExp(`^${rule.split('*').map(escapeRegExp).join('.*')}`).test(path);
  return path.startsWith(rule);
}

export function agentMatches(row: Pick<LogRow, 'botType' | 'httpUserAgent'>, agent: string): boolean {
  if (agent === '*') return true;
  const needle = agent.toLowerCase();
  return row.botType.toLowerCase().includes(needle) || row.httpUserAgent.toLowerCase().includes(needle);
}

export function disallowMatches(row: Pick<LogRow, 'path' | 'botType' | 'httpUserAgent'>, rules: RobotsRule[]): string[] {
  const path = normalizePathWithQuery(row.path);
  return rules
    .filter((rule) => rule.directive === 'disallow')
    .filter((rule) => agentMatches(row, rule.agent))
    .filter((rule) => pathMatchesDisallow(path, rule.value))
    .map((rule) => `${rule.agent}: ${rule.value}`);
}
