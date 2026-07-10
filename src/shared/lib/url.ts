import type { LogRow, PageType } from '../types/domain';

const technicalPrefixes = ['/_', '/wp-', '/wp/', '/bitrix/', '/api/', '/admin', '/robots.txt', '/sitemap'];
const servicePrefixes = ['/cart', '/checkout', '/login', '/auth', '/search', '/feed'];
const fileExtensions = /\.(?:jpg|jpeg|png|webp|gif|svg|ico|css|js|pdf|zip|xml|txt|csv|xlsx?)$/i;

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
  if (path === '/') return { section: 'Главная', pageType: 'other' };
  if (fileExtensions.test(path)) return { section: '/_files', pageType: 'file' };
  if (technicalPrefixes.some((prefix) => path.startsWith(prefix))) return { section: '/_technical', pageType: 'technical' };
  if (servicePrefixes.some((prefix) => path.startsWith(prefix))) return { section: '/_service', pageType: 'service' };
  const first = path.split('/').filter(Boolean)[0];
  return { section: first ? `/${first}` : 'Главная', pageType: 'other' };
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
