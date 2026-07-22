export type AgentGroup =
  | 'ai_data_scraper_bot'
  | 'ai_assistant_bot'
  | 'ai_agent_bot'
  | 'ai_bot_search_crawler';

export type PageType = 'technical' | 'service' | 'file' | 'other';

export interface LogRow {
  sid?: string;
  datetimeRaw: string;
  dateRaw?: string;
  parsedAt: Date | null;
  date: string;
  requestCount?: number;
  hour: number | null;
  minute: number | null;
  httpUserAgent: string;
  uniqId: string;
  path: string;
  country: string;
  asn: string;
  subnet: string;
  netname: string;
  requestStatus: string;
  botType: string;
  agentGroup: AgentGroup;
  host?: string;
  sslsignName?: string;
  uaGroup?: string;
  section: string;
  pageType: PageType;
}

export interface ImportedFileMeta {
  id: string;
  kind: 'logs';
  name: string;
  rowCount: number;
  uploadedAt: string;
}

export interface TextFilePayload {
  name: string;
  content: string;
}

export interface FiltersState {
  dateFrom: string;
  dateTo: string;
  agentGroups: AgentGroup[];
  agentDetails: string[];
  requestStatuses: string[];
  sections: string[];
  excludedSections: string[];
  countries: string[];
  pathQuery: string;
}

export interface ParsedLogResult {
  rows: LogRow[];
  rowCount: number;
  detectedColumns: string[];
  usedUaGroupColumn: boolean;
}

export interface SitemapUrl {
  url: string;
  path: string;
  title: string;
  group: string;
  depth: number;
  lastmod: string;
  changefreq: string;
  priority: string;
}

export interface RobotsRule {
  agent: string;
  directive: 'disallow' | 'crawl-delay' | 'sitemap' | 'clean-param';
  value: string;
}

export interface PersistedState {
  version: 3;
  rows: LogRow[];
  files: ImportedFileMeta[];
  sitemapFiles: TextFilePayload[];
  robotsTxt: string;
}

export const emptyFilters: FiltersState = {
  dateFrom: '',
  dateTo: '',
  agentGroups: [],
  agentDetails: [],
  requestStatuses: [],
  sections: [],
  excludedSections: [],
  countries: [],
  pathQuery: '',
};

export function normalizeFilters(filters?: Partial<FiltersState> | null): FiltersState {
  return {
    dateFrom: filters?.dateFrom ?? '',
    dateTo: filters?.dateTo ?? '',
    agentGroups: Array.isArray(filters?.agentGroups) ? filters.agentGroups : [],
    agentDetails: Array.isArray(filters?.agentDetails) ? filters.agentDetails : [],
    requestStatuses: Array.isArray(filters?.requestStatuses) ? filters.requestStatuses : [],
    sections: Array.isArray(filters?.sections) ? filters.sections : [],
    excludedSections: Array.isArray(filters?.excludedSections) ? filters.excludedSections : [],
    countries: Array.isArray(filters?.countries) ? filters.countries : [],
    pathQuery: filters?.pathQuery ?? '',
  };
}
