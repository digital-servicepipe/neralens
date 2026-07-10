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

export function refineSections(rows: LogRow[]): LogRow[] {
  return rows.map((row) => {
    const page = getSectionAndPageType(row.path);
    return { ...row, section: page.section, pageType: page.pageType };
  });
}

function normalizeSectionFilter(section: string): string {
  if ((siteSectionOrder as readonly string[]).includes(section)) return section;
  return getSectionAndPageType(section).section;
}

export function filterRows(rows: LogRow[], filters: Partial<FiltersState>): LogRow[] {
  const safeFilters = normalizeFilters(filters);
  const pathQuery = safeFilters.pathQuery.trim().toLowerCase();
  const selectedSections = safeFilters.sections.map(normalizeSectionFilter);
  return rows.filter((row) => {
    if (safeFilters.dateFrom && row.date < safeFilters.dateFrom) return false;
    if (safeFilters.dateTo && row.date > safeFilters.dateTo) return false;
    if (safeFilters.agentGroups.length && !safeFilters.agentGroups.includes(row.agentGroup)) return false;
    if (safeFilters.agentDetails.length && !safeFilters.agentDetails.includes(getBotDisplayName(row.botType, row.httpUserAgent))) return false;
    if (safeFilters.requestStatuses.length && !safeFilters.requestStatuses.includes(row.requestStatus)) return false;
    if (selectedSections.length && !selectedSections.includes(row.section)) return false;
    if (safeFilters.countries.length && !safeFilters.countries.includes(row.country)) return false;
    if (pathQuery && !row.path.toLowerCase().includes(pathQuery)) return false;
    return true;
  });
}

function countBy<T extends string>(rows: LogRow[], getKey: (row: LogRow) => T): CountShare[] {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(getKey(row) || 'Неизвестно', (map.get(getKey(row) || 'Неизвестно') ?? 0) + 1));
  const total = rows.length || 1;
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

export function buildKpis(rows: LogRow[], robotsTxt = ''): Kpis {
  const robots = parseRobotsTxt(robotsTxt);
  return {
    totalRequests: rows.length,
    uniqueUrls: new Set(rows.map((row) => row.path)).size,
    uniqueAgents: new Set(rows.map((row) => getBotDisplayName(row.botType, row.httpUserAgent))).size,
    countries: new Set(rows.map((row) => row.country).filter(Boolean)).size,
    blockedHits: robotsTxt ? rows.filter((row) => disallowMatches(row, robots).length > 0).length : 0,
    activeDays: new Set(rows.map((row) => row.date).filter((date) => date !== 'Unknown')).size,
  };
}

export function buildFilterOptions(rows: LogRow[]) {
  const sections = Array.from(new Set(rows.map((row) => row.section))).sort((a, b) => {
    const indexA = siteSectionOrder.indexOf(a as (typeof siteSectionOrder)[number]);
    const indexB = siteSectionOrder.indexOf(b as (typeof siteSectionOrder)[number]);
    if (indexA !== -1 || indexB !== -1) return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    return a.localeCompare(b, 'ru');
  });
  const activeDates = rows.reduce<Record<string, number>>((dates, row) => {
    if (row.date && row.date !== 'Unknown') dates[row.date] = (dates[row.date] ?? 0) + 1;
    return dates;
  }, {});
  const agentDetailGroups = rows.reduce<Record<string, AgentGroup[]>>((map, row) => {
    const name = getBotDisplayName(row.botType, row.httpUserAgent);
    if (!map[name]) map[name] = [];
    if (!map[name].includes(row.agentGroup)) map[name].push(row.agentGroup);
    return map;
  }, {});

  return {
    agentGroups: Array.from(new Set(rows.map((row) => row.agentGroup))) as AgentGroup[],
    agentDetails: Array.from(new Set(rows.map((row) => getBotDisplayName(row.botType, row.httpUserAgent)))).sort((a, b) => a.localeCompare(b, 'ru')),
    agentDetailGroups,
    requestStatuses: Array.from(new Set(rows.map((row) => row.requestStatus).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    sections,
    countries: Array.from(new Set(rows.map((row) => row.country).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    activeDates,
  };
}

export function dailySeries(rows: LogRow[]) {
  const days = Array.from(new Set(rows.map((row) => row.date).filter((date) => date !== 'Unknown'))).sort();
  return days.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const groups = countBy(dayRows, (row) => row.agentGroup);
    return {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      ...Object.fromEntries(groups.map((item) => [item.label, item.count])),
    };
  });
}

export function hourlySeries(rows: LogRow[], dateFrom?: string, dateTo?: string) {
  const dayCount = Math.max(1, new Set(rows.map((row) => row.date).filter((date) => date !== 'Unknown')).size);
  return Array.from({ length: 24 }, (_, hour) => {
    const total = rows.filter((row) => row.hour === hour).length;
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

export function buildTopLists(rows: LogRow[]) {
  return {
    botGroups: countBy(rows, (row) => row.agentGroup).slice(0, 10),
    agents: countBy(rows, (row) => getBotDisplayName(row.botType, row.httpUserAgent)).slice(0, 10),
    sections: countBy(rows, (row) => row.section).slice(0, 12),
    statuses: countBy(rows, (row) => row.requestStatus).slice(0, 16),
    countries: countBy(rows, (row) => row.country).slice(0, 12),
    netnames: countBy(rows, (row) => row.netname).slice(0, 12),
    urls: countBy(rows, (row) => row.path).slice(0, 80),
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
        const bot = getBotDisplayName(row.botType, row.httpUserAgent);
        bots[bot] = (bots[bot] ?? 0) + 1;
      });
      return {
        path,
        rawPath: pathRows[0]?.path ?? path,
        total: pathRows.length,
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
