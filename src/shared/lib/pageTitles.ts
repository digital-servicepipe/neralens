import type { TextFilePayload } from '../types/domain';
import { servicepipePageTitles } from '../data/servicepipePageTitles';
import { normalizePath, titleFromPath } from './url';

export interface PageTitleInfo {
  path: string;
  title: string;
  source: 'json' | 'route' | 'builtin' | 'fallback';
  section?: 'main' | 'blog' | 'news';
}

export type PageTitleCatalog = Map<string, PageTitleInfo>;

const routeTitles: Record<string, string> = {
  '/': 'Разрабатываем системы высокоточного контроля трафика',
  '/about': 'Кто мы',
  '/antibot': 'Web DDoS & Bot Protection',
  '/antifraud': 'Digital Fraud Protection',
  '/blog': 'Статьи',
  '/career': 'Карьера в Servicepipe',
  '/contacts': 'Контакты',
  '/cybersecurity-lab': 'Исследовательская лаборатория Servicepipe',
  '/cybert': 'Cybert',
  '/dosgate': 'DosGate',
  '/dosgate/autopilot': 'DosGate Autopilot',
  '/dosgate/rlog': 'DosGate RLOG',
  '/flowcollector': 'FlowCollector',
  '/finance': 'Высокоточная защита финансовых сервисов от кибератак и регуляторных рисков',
  '/ip-transit': 'Network DDoS Protection',
  '/it-career-start': 'Войди в IT через кибербезопасность',
  '/marketing': 'Высокоточная защита сайта от накрутки поведенческих факторов',
  '/news': 'Новости Servicepipe',
  '/partners': 'Партнеры',
  '/partners/wmx': 'WMX — технологический партнёр Servicepipe',
  '/press-center': 'СМИ о нас',
  '/price': 'Цены',
  '/prices': 'Цены',
  '/pricing': 'Цены',
  '/products': 'Продукты',
  '/retail': 'Лучшие практики защиты онлайн-ритейла от кибератак',
  '/secure-dns-hosting': 'Secure DNS Hosting',
  '/certificate': 'Сертификаты',
  '/certificates': 'Сертификаты',
  '/certificates-and-licenses': 'Сертификаты и лицензии',
  '/license': 'Лицензии',
  '/licenses': 'Лицензии',
  '/stress-test': 'Stress Test',
  '/telecom': 'Комплексная DDoS-защита для операторов связи',
  '/visibla': 'Visibla',
  '/visibla/scan': 'Visibla Scan',
  '/visibla/verify': 'Visibla Verify',
  '/waf': 'Cloud WAF',
  '/web-ddos-protection': 'Web DDoS Protection',
  '/web-log-analysis': 'Web Log Analysis',
  '/why-servicepipe': 'Почему Servicepipe',
};

const suffixPatterns = [
  /\s*[|—-]\s*Блог\s+Servicepipe\s*$/i,
  /\s*[|—-]\s*Пресс-релиз(?:ы)?\s+Servicepipe\s*$/i,
  /\s*[|—-]\s*Новости\s+Servicepipe\s*$/i,
  /\s*[|—-]\s*Servicepipe\s*$/i,
];

function cleanTitle(value: unknown): string {
  let title = String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  suffixPatterns.forEach((pattern) => {
    title = title.replace(pattern, '').trim();
  });
  return title;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
}

function unwrapRecord(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  const attributes = asRecord(record?.attributes);
  return attributes ? { ...record, ...attributes } : record;
}

function sectionFromFileName(fileName: string): 'blog' | 'news' | undefined {
  const name = fileName.toLowerCase();
  if (name.includes('news')) return 'news';
  if (name.includes('article') || name.includes('blog')) return 'blog';
  return undefined;
}

function prefixedPath(slugOrPath: string, section: 'blog' | 'news' | undefined): string {
  if (/^https?:\/\//i.test(slugOrPath) || slugOrPath.startsWith('/')) return normalizePath(slugOrPath);
  const slug = slugOrPath.replace(/^\/+|\/+$/g, '');
  if (!slug) return '/';
  if (section === 'blog') return normalizePath(`/blog/${slug}`);
  if (section === 'news') return normalizePath(`/press-center/${slug}`);
  return normalizePath(`/${slug}`);
}

function addTitle(catalog: PageTitleCatalog, path: string, title: string, section?: 'main' | 'blog' | 'news') {
  const clean = cleanTitle(title);
  if (!clean) return;
  const normalized = normalizePath(path);
  catalog.set(normalized, { path: normalized, title: clean, source: 'json', section });
}

function parseJsonTitleFile(file: TextFilePayload, catalog: PageTitleCatalog) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(file.content);
  } catch {
    return;
  }

  const root = asRecord(parsed);
  const items = Array.isArray(root?.data) ? root.data : Array.isArray(parsed) ? parsed : [];
  const section = sectionFromFileName(file.name);
  items.forEach((rawItem) => {
    const item = unwrapRecord(rawItem);
    if (!item) return;

    const slugOrPath = readField(item, ['url', 'slug', 'path', 'href']);
    const title = readField(item, ['metaTitle', 'h1', 'title', 'name', 'heading']);
    if (!slugOrPath || !title) return;

    const primaryPath = prefixedPath(slugOrPath, section);
    addTitle(catalog, primaryPath, title, section);

    if (!/^https?:\/\//i.test(slugOrPath) && !slugOrPath.startsWith('/')) {
      addTitle(catalog, normalizePath(`/${slugOrPath}`), title, section);
      if (section === 'news') {
        addTitle(catalog, normalizePath(`/news/${slugOrPath}`), title, section);
      }
    }
  });
}

export function buildPageTitleCatalog(files: TextFilePayload[] = []): PageTitleCatalog {
  const catalog: PageTitleCatalog = new Map();
  Object.entries(servicepipePageTitles).forEach(([path, title]) => {
    const normalized = normalizePath(path);
    catalog.set(normalized, {
      path: normalized,
      title,
      source: 'builtin',
      section: normalized.startsWith('/blog/') ? 'blog' : normalized.startsWith('/news/') || normalized.startsWith('/press-center/') ? 'news' : undefined,
    });
  });
  Object.entries(routeTitles).forEach(([path, title]) => {
    catalog.set(path, { path, title, source: 'route', section: 'main' });
  });

  files.forEach((file) => {
    const firstChar = file.content.trimStart()[0];
    if (firstChar === '{' || firstChar === '[' || file.name.toLowerCase().endsWith('.json')) {
      parseJsonTitleFile(file, catalog);
    }
  });

  return catalog;
}

export function displayTitleForPath(path: string, catalog?: PageTitleCatalog): string {
  const normalized = normalizePath(path);
  return catalog?.get(normalized)?.title ?? titleFromPath(normalized);
}
