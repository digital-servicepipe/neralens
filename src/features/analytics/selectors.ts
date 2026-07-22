import { getBotDisplayName } from '../bots/botDictionary';
import { disallowMatches, parseRobotsTxt, parseSitemapXml } from '../sitemap-board/sitemapParser';
import { normalizeFilters, type AgentGroup, type FiltersState, type LogRow, type SitemapUrl, type TextFilePayload } from '../../shared/types/domain';
import { getSectionAndPageType, siteSectionOrder } from '../../shared/lib/url';
import { buildPageTitleCatalog } from '../../shared/lib/pageTitles';

export interface CountShare {
  label: string;
  count: number;
  share: number;
}

export interface Kpis {
  totalRequests: number;
  uniqueUrls: number;
  uniqueAgents: number;
  countries: number;
  blockedHits: number;
  activeDays: number;
}

export type AnalyticsRow = LogRow & {
  botName: string;
  pathLower: string;
};

function botNameFor(row: LogRow | AnalyticsRow) {
  return 'botName' in row ? row.botName : getBotDisplayName(row.botType, row.httpUserAgent);
}

function pathLowerFor(row: LogRow | AnalyticsRow) {
  return 'pathLower' in row ? row.pathLower : row.path.toLowerCase();
}

export function requestCountFor(row: LogRow | AnalyticsRow) {
  return row.requestCount && row.requestCount > 0 ? row.requestCount : 1;
}

export function totalRequestCount(rows: Array<LogRow | AnalyticsRow>) {
  return rows.reduce((sum, row) => sum + requestCountFor(row), 0);
}

export function refineSections(rows: LogRow[]): AnalyticsRow[] {
  return rows.map((row) => {
    const page = getSectionAndPageType(row.path);
    return {
      ...row,
      section: page.section,
      pageType: page.pageType,
      botName: getBotDisplayName(row.botType, row.httpUserAgent),
      pathLower: row.path.toLowerCase(),
    };
  });
}

function normalizeSectionFilter(section: string): string {
  if ((siteSectionOrder as readonly string[]).includes(section)) return section;
  return getSectionAndPageType(section).section;
}

export function filterRows<T extends LogRow | AnalyticsRow>(rows: T[], filters: Partial<FiltersState>): T[] {
  const safeFilters = normalizeFilters(filters);
  const pathQuery = safeFilters.pathQuery.trim().toLowerCase();
  const selectedSections = new Set(safeFilters.sections.map(normalizeSectionFilter));
  const excludedSections = new Set(safeFilters.excludedSections.map(normalizeSectionFilter));
  const agentGroups = new Set(safeFilters.agentGroups);
  const agentDetails = new Set(safeFilters.agentDetails);
  const requestStatuses = new Set(safeFilters.requestStatuses);
  const countries = new Set(safeFilters.countries);
  return rows.filter((row) => {
    if (safeFilters.dateFrom && row.date < safeFilters.dateFrom) return false;
    if (safeFilters.dateTo && row.date > safeFilters.dateTo) return false;
    if (agentGroups.size && !agentGroups.has(row.agentGroup)) return false;
    if (agentDetails.size && !agentDetails.has(botNameFor(row))) return false;
    if (requestStatuses.size && !requestStatuses.has(row.requestStatus)) return false;
    if (selectedSections.size && !selectedSections.has(row.section)) return false;
    if (excludedSections.has(row.section)) return false;
    if (countries.size && !countries.has(row.country)) return false;
    if (pathQuery && !pathLowerFor(row).includes(pathQuery)) return false;
    return true;
  });
}

function countBy<T extends string>(rows: LogRow[], getKey: (row: LogRow) => T): CountShare[] {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const key = getKey(row) || 'Неизвестно';
    map.set(key, (map.get(key) ?? 0) + requestCountFor(row));
  });
  const total = totalRequestCount(rows) || 1;
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

export function buildKpis(rows: Array<LogRow | AnalyticsRow>, robotsTxt = ''): Kpis {
  const robots = parseRobotsTxt(robotsTxt);
  const urls = new Set<string>();
  const agents = new Set<string>();
  const countries = new Set<string>();
  const days = new Set<string>();
  let blockedHits = 0;
  let totalRequests = 0;

  rows.forEach((row) => {
    const count = requestCountFor(row);
    totalRequests += count;
    urls.add(row.path);
    agents.add(botNameFor(row));
    if (row.country) countries.add(row.country);
    if (row.date !== 'Unknown') days.add(row.date);
    if (robotsTxt && disallowMatches(row, robots).length > 0) blockedHits += count;
  });

  return {
    totalRequests,
    uniqueUrls: urls.size,
    uniqueAgents: agents.size,
    countries: countries.size,
    blockedHits,
    activeDays: days.size,
  };
}

export function buildFilterOptions(rows: Array<LogRow | AnalyticsRow>) {
  const sectionSet = new Set<string>();
  const agentGroups = new Set<AgentGroup>();
  const agentDetails = new Set<string>();
  const requestStatuses = new Set<string>();
  const countries = new Set<string>();
  const activeDates: Record<string, number> = {};
  const agentDetailGroups: Record<string, AgentGroup[]> = {};

  rows.forEach((row) => {
    const count = requestCountFor(row);
    sectionSet.add(row.section);
    agentGroups.add(row.agentGroup);
    const botName = botNameFor(row);
    agentDetails.add(botName);
    if (row.requestStatus) requestStatuses.add(row.requestStatus);
    if (row.country) countries.add(row.country);
    if (row.date && row.date !== 'Unknown') activeDates[row.date] = (activeDates[row.date] ?? 0) + count;
    if (!agentDetailGroups[botName]) agentDetailGroups[botName] = [];
    if (!agentDetailGroups[botName].includes(row.agentGroup)) agentDetailGroups[botName].push(row.agentGroup);
  });

  const sections = Array.from(sectionSet).sort((a, b) => {
    const indexA = siteSectionOrder.indexOf(a as (typeof siteSectionOrder)[number]);
    const indexB = siteSectionOrder.indexOf(b as (typeof siteSectionOrder)[number]);
    if (indexA !== -1 || indexB !== -1) return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    return a.localeCompare(b, 'ru');
  });

  return {
    agentGroups: Array.from(agentGroups),
    agentDetails: Array.from(agentDetails).sort((a, b) => a.localeCompare(b, 'ru')),
    agentDetailGroups,
    requestStatuses: Array.from(requestStatuses).sort((a, b) => a.localeCompare(b, 'ru')),
    sections,
    countries: Array.from(countries).sort((a, b) => a.localeCompare(b, 'ru')),
    activeDates,
  };
}

export function dailySeries(rows: LogRow[]) {
  const byDate = new Map<string, Record<string, number>>();
  rows.forEach((row) => {
    if (!row.date || row.date === 'Unknown') return;
    const count = requestCountFor(row);
    const item = byDate.get(row.date) ?? {};
    item[row.agentGroup] = (item[row.agentGroup] ?? 0) + count;
    byDate.set(row.date, item);
  });

  return Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, groups]) => ({
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      ...groups,
    }));
}

export function hourlySeries(rows: LogRow[], dateFrom?: string, dateTo?: string) {
  const dayCount = Math.max(1, new Set(rows.map((row) => row.date).filter((date) => date !== 'Unknown')).size);
  const totals = Array.from({ length: 24 }, () => 0);
  rows.forEach((row) => {
    if (typeof row.hour === 'number' && row.hour >= 0 && row.hour < 24) totals[row.hour] += requestCountFor(row);
  });

  return totals.map((total, hour) => {
    return {
      key: String(hour),
      shortLabel: `${String(hour).padStart(2, '0')}:00`,
      intervalLabel: `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`,
      count: Math.round((total / dayCount) * 10) / 10,
      totalCount: total,
      daysCount: dayCount,
      dateFrom,
      dateTo,
    };
  });
}

function toCountShare(map: Map<string, number>, total: number, limit: number): CountShare[] {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, share: count / Math.max(1, total) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function buildTopLists(rows: Array<LogRow | AnalyticsRow>) {
  const botGroups = new Map<string, number>();
  const agents = new Map<string, number>();
  const sections = new Map<string, number>();
  const statuses = new Map<string, number>();
  const countries = new Map<string, number>();
  const netnames = new Map<string, number>();
  const urls = new Map<string, number>();

  rows.forEach((row) => {
    const count = requestCountFor(row);
    botGroups.set(row.agentGroup, (botGroups.get(row.agentGroup) ?? 0) + count);
    const botName = botNameFor(row);
    agents.set(botName, (agents.get(botName) ?? 0) + count);
    sections.set(row.section, (sections.get(row.section) ?? 0) + count);
    statuses.set(row.requestStatus || 'Неизвестно', (statuses.get(row.requestStatus || 'Неизвестно') ?? 0) + count);
    countries.set(row.country || 'Неизвестно', (countries.get(row.country || 'Неизвестно') ?? 0) + count);
    netnames.set(row.netname || 'Неизвестно', (netnames.get(row.netname || 'Неизвестно') ?? 0) + count);
    urls.set(row.path, (urls.get(row.path) ?? 0) + count);
  });
  const total = totalRequestCount(rows);

  return {
    botGroups: toCountShare(botGroups, total, 10),
    agents: toCountShare(agents, total, 10),
    sections: toCountShare(sections, total, 12),
    statuses: toCountShare(statuses, total, 16),
    countries: toCountShare(countries, total, 12),
    netnames: toCountShare(netnames, total, 12),
    urls: toCountShare(urls, total, 80),
  };
}

export interface UrlSummary {
  path: string;
  rawPath: string;
  total: number;
  bots: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  disallowedBy: string[];
}

export function buildUrlSummaries(rows: LogRow[], robotsTxt: string): UrlSummary[] {
  const robots = parseRobotsTxt(robotsTxt);
  const map = new Map<string, LogRow[]>();
  rows.forEach((row) => {
    const list = map.get(row.path) ?? [];
    list.push(row);
    map.set(row.path, list);
  });
  return Array.from(map.entries())
    .map(([path, pathRows]) => {
      const dates = pathRows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
      const bots: Record<string, number> = {};
      pathRows.forEach((row) => {
        const bot = botNameFor(row);
        bots[bot] = (bots[bot] ?? 0) + requestCountFor(row);
      });
      return {
        path,
        rawPath: pathRows[0]?.path ?? path,
        total: totalRequestCount(pathRows),
        bots,
        firstSeen: dates[0] ?? 'Unknown',
        lastSeen: dates.at(-1) ?? 'Unknown',
        disallowedBy: Array.from(new Set(pathRows.flatMap((row) => disallowMatches(row, robots)))),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function parseAllSitemapFiles(files: TextFilePayload[]): SitemapUrl[] {
  const titleCatalog = buildPageTitleCatalog(files);
  return files.flatMap((file) => {
    if (file.name.toLowerCase().endsWith('.json') || ['{', '['].includes(file.content.trimStart()[0] ?? '')) return [];
    return parseSitemapXml(file.content, titleCatalog).map((url) => ({ ...url, group: file.name }));
  });
}
