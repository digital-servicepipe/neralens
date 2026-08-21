import type { LogRow, PageType } from '../types/domain';

export const technicalSection = 'Технические';
export const pdfSection = 'PDF';
export const fileSection = 'Файлы';
export const specialSectionOrder = ['/', technicalSection, pdfSection, fileSection] as const;

export const servicepipeSectionLabels = {
  blog: 'Блог',
  pressCenter: 'Пресс-центр',
  news: 'Новости',
  products: 'Продуктовые страницы',
  industries: 'Отраслевые страницы',
  company: 'Компания',
  partners: 'Партнёрам',
  misc: 'Прочее',
} as const;

const servicepipeProductPaths = new Set([
  '/web-log-analysis',
  '/stress-test',
  '/visibla/verify',
  '/visibla/scan',
  '/visibla',
  '/secure-dns-hosting',
  '/waf',
  '/antifraud',
  '/antibot',
  '/web-ddos-protection',
  '/cybert',
  '/ip-transith',
  '/ip-transit',
  '/flowcollector',
  '/dosgate',
  '/dosgate/autopilot',
  '/dosgate/rlog',
]);

const servicepipeIndustryPaths = new Set([
  '/telecom/security-direct-connect',
  '/telecom/hub-flowcollector',
  '/retail',
  '/telecom',
  '/marketing',
  '/finance',
]);

const servicepipeCompanyPaths = new Set([
  '/about',
  '/certificates',
  '/pricing',
  '/contacts',
  '/career',
  '/it-career-start',
  '/cybersecurity-lab',
  '/why-servicepipe',
]);

const servicepipePartnerPaths = new Set([
  '/partners/wmx',
  '/partners',
]);

const servicepipeMiscPrefixes = [
  '/@fs',
  '/actuator',
  '/audit',
  '/aws',
  '/network',
  '/stati',
  '/web',
];

const technicalPrefixes = ['/_', '/wp-', '/wp/', '/bitrix/', '/api/', '/admin', '/debug', '/robots.txt', '/sitemap', '/ssl/', '/xpvnsulc'];
const technicalExactPaths = ['/graphql', '/ngsw.json', '/server-info', '/server-status'];
const technicalSegmentNames = ['.aws', '.cursor', '.git', 'git', 'secrets', 'config'];
const technicalFileNames = [
  '.bash_history',
  '.bash_profile',
  '.bashrc',
  '.env',
  'account.json',
  'application.yml',
  'application.yaml',
  'composer.json',
  'composer.lock',
  'config.json',
  'credentials',
  'env',
  'keyfile',
  'manifest.json',
  'mcp.json',
  'ngsw.json',
  'package-lock.json',
  'package.json',
  'phpinfo.php',
  'secrets.json',
  'settings.json',
  'settings.py',
  'web.config',
];
const technicalExtensions = /\.(?:bak|conf|config|crt|ini|json|key|log|map|pem|py|sql|ya?ml)$/i;
const technicalPhpFileNames = [
  'app_dev.php',
  'captcha_image.php',
  'index_dev.php',
  'phpinfo.php',
  'xmlrpc.php',
];
const pdfExtension = /\.pdf$/i;
const fileExtensions = /\.(?:jpg|jpeg|png|webp|gif|svg|ico|css|js|zip|xml|txt|csv|xlsx?)$/i;

function isTechnicalPath(path: string): boolean {
  if (technicalPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(prefix))) return true;
  if (technicalExactPaths.includes(path)) return true;
  if (technicalExtensions.test(path)) return true;

  const segments = path.split('/').filter(Boolean);
  return segments.some((segment) => {
    const name = segment.toLowerCase();
    return name.startsWith('.')
      || name.startsWith('_')
      || technicalSegmentNames.includes(name)
      || name.includes('serviceaccountkey')
      || name.includes('.env')
      || technicalPhpFileNames.includes(name)
      || technicalFileNames.some((fileName) => name === fileName || name.startsWith(`${fileName}.`));
  });
}

function safeDecodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return decodeURI(path);
  }
}

function stripQueryAndHash(path: string): string {
  return path
    .replace(/%(?:3f|23).*/i, '')
    .split(/[?#]/)[0] ?? '/';
}

export function normalizePath(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '/';
  try {
    const url = /^https?:\/\//i.test(trimmed) ? new URL(trimmed) : new URL(trimmed, 'https://placeholder.invalid');
    const decoded = stripQueryAndHash(safeDecodePath(url.pathname || '/'));
    return decoded !== '/' ? decoded.replace(/\/$/g, '') : '/';
  } catch {
    const path = stripQueryAndHash(trimmed);
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
  if (path === '/') return { section: '/', pageType: 'other' };
  if (isTechnicalPath(path)) return { section: technicalSection, pageType: 'technical' };
  if (pdfExtension.test(path)) return { section: pdfSection, pageType: 'file' };
  if (fileExtensions.test(path)) return { section: fileSection, pageType: 'file' };
  const firstSegment = path.split('/').filter(Boolean)[0];
  return { section: firstSegment ? `/${firstSegment}` : '/', pageType: 'other' };
}

export function getServicepipeSection(raw: string): string | null {
  const path = normalizePath(raw).toLowerCase();
  if (path === '/blog' || path.startsWith('/blog/')) return servicepipeSectionLabels.blog;
  if (path === '/press-center' || path.startsWith('/press-center/')) return servicepipeSectionLabels.pressCenter;
  if (path === '/news' || path.startsWith('/news/')) return servicepipeSectionLabels.news;
  if (servicepipeProductPaths.has(path)) return servicepipeSectionLabels.products;
  if (servicepipeIndustryPaths.has(path)) return servicepipeSectionLabels.industries;
  if (servicepipeCompanyPaths.has(path)) return servicepipeSectionLabels.company;
  if (servicepipePartnerPaths.has(path)) return servicepipeSectionLabels.partners;
  if (servicepipeMiscPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return servicepipeSectionLabels.misc;
  return null;
}

export function titleFromPath(path: string): string {
  if (path === '/') return 'Главная';
  const last = normalizePath(path).split('/').filter(Boolean).at(-1) || path;
  return decodeURIComponent(last).replace(/[-_]+/g, ' ').trim() || path;
}

export function absoluteUrl(path: string, domain: string): string {
  const host = domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/g, '');
  if (!host) return /^https?:\/\//i.test(path) ? path : normalizePath(path);
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
