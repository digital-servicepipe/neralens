import type { LogRow, PageType } from '../types/domain';

export const siteSectionOrder = ['Новости', 'Блог', 'СМИ о нас', 'Главная страница', 'Продуктовые', 'Решения', 'Компания', 'Технические', 'Служебные', 'PDF', 'Файлы', 'Другое'] as const;

const technicalPrefixes = ['/_', '/wp-', '/wp/', '/bitrix/', '/api/', '/admin', '/robots.txt', '/sitemap', '/xpvnsulc'];
const technicalExactPaths = ['/graphql'];
const technicalSegmentNames = ['.aws', '.cursor', '.git', 'git', 'secrets'];
const technicalFileNames = [
  '.env',
  'account.json',
  'application.yml',
  'application.yaml',
  'config.json',
  'credentials',
  'env',
  'keyfile',
  'manifest.json',
  'mcp.json',
  'secrets.json',
];
const technicalExtensions = /\.(?:map|ya?ml)$/i;
const servicePrefixes = ['/cart', '/checkout', '/login', '/auth', '/search', '/feed'];
const pdfExtension = /\.pdf$/i;
const fileExtensions = /\.(?:jpg|jpeg|png|webp|gif|svg|ico|css|js|zip|xml|txt|csv|xlsx?)$/i;

const productPrefixes = [
  '/dosgate',
  '/flowcollector',
  '/ip-transit',
  '/cybert',
  '/web-ddos-protection',
  '/antibot',
  '/antifraud',
  '/waf',
  '/secure-dns-hosting',
  '/visibla',
  '/stress-test',
  '/web-log-analysis',
];

const solutionPrefixes = ['/finance', '/telecom', '/retail', '/marketing', '/migration'];

const companyPrefixes = [
  '/about',
  '/career',
  '/it-career-start',
  '/cybersecurity-lab',
  '/contacts',
  '/why-servicepipe',
  '/partners',
  '/education',
  '/events',
];

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function isTechnicalPath(path: string): boolean {
  if (technicalPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix))) return true;
  if (technicalExactPaths.includes(path)) return true;
  if (technicalExtensions.test(path)) return true;

  const segments = path.split('/').filter(Boolean);
  return segments.some((segment) => {
    const name = segment.toLowerCase();
    return technicalSegmentNames.includes(name)
      || name.includes('.env')
      || technicalFileNames.some((fileName) => name === fileName || name.startsWith(`${fileName}.`));
  });
}

export function normalizePath(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '/';
  try {
    const url = /^https?:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(trimmed, 'https://placeholder.invalid');
    const decoded = decodeURI(url.pathname || '/');
    return decoded !== '/' ? decoded.replace(/\/$/g, '') : '/';
  } catch {
    const [path] = trimmed.split('?');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized !== '/' ? normalized.replace(/\/$/g, '') : '/';
  }
}

export function normalizePathWithQuery(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '/';
  try {
    const url = /^https?:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(trimmed, 'https://placeholder.invalid');
    return `${decodeURI(url.pathname || '/')}${url.search}`;
  } catch {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}

export function getSectionAndPageType(raw: string): { section: string; pageType: PageType } {
  const path = normalizePath(raw).toLowerCase();
  if (path === '/') return { section: 'Главная страница', pageType: 'other' };
  if (isTechnicalPath(path)) return { section: 'Технические', pageType: 'technical' };
  if (servicePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return { section: 'Служебные', pageType: 'service' };
  if (pdfExtension.test(path)) return { section: 'PDF', pageType: 'file' };
  if (fileExtensions.test(path)) return { section: 'Файлы', pageType: 'file' };
  if (path === '/news' || path.startsWith('/news/')) return { section: 'Новости', pageType: 'other' };
  if (path === '/press-center' || path.startsWith('/press-center/')) return { section: 'СМИ о нас', pageType: 'other' };
  if (path === '/blog' || path.startsWith('/blog/')) return { section: 'Блог', pageType: 'other' };
  if (startsWithAny(path, productPrefixes)) return { section: 'Продуктовые', pageType: 'other' };
  if (startsWithAny(path, solutionPrefixes)) return { section: 'Решения', pageType: 'other' };
  if (startsWithAny(path, companyPrefixes)) return { section: 'Компания', pageType: 'other' };
  return { section: 'Другое', pageType: 'other' };
}

export function titleFromPath(path: string): string {
  if (path === '/') return 'Главная';
  const last = normalizePath(path).split('/').filter(Boolean).at(-1) || path;
  return decodeURIComponent(last).replace(/[-_]+/g, ' ').trim() || path;
}

export function absoluteUrl(path: string, domain: string): string {
  const host = domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/g, '') || 'neralens.ru';
  return /^https?:\/\//i.test(path) ? path : `https://${host}${path.startsWith('/') ? path : `/${path}`}`;
}

function cleanHost(value: string | undefined): string {
  const text = String(value || '').trim();
  if (!text) return '';
  try {
    const parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    return parsed.host;
  } catch {
    return text.replace(/^https?:\/\//i, '').replace(/\/.*$/g, '');
  }
}

export function hostForPath(rows: Pick<LogRow, 'path' | 'host'>[], path: string): string {
  const counts = new Map<string, number>();
  rows
    .filter((row) => row.path === path)
    .map((row) => cleanHost(row.host))
    .filter(Boolean)
    .forEach((host) => counts.set(host, (counts.get(host) ?? 0) + 1));

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function absoluteUrlForPath(path: string, rows: Pick<LogRow, 'path' | 'host'>[], fallbackDomain: string): string {
  return absoluteUrl(path, hostForPath(rows, path) || fallbackDomain);
}
