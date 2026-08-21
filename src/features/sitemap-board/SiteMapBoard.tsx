import { useMemo, useState } from 'react';
import { ChevronDown, Home, Search } from 'lucide-react';
import { absoluteUrlForPath, getServicepipeSection, normalizePath, servicepipeSectionLabels } from '../../shared/lib/url';
import { formatNumber, truncateMiddle } from '../../shared/lib/format';
import { displayTitleForPath, type PageTitleCatalog } from '../../shared/lib/pageTitles';
import { servicepipeSitemapEntries } from '../../shared/data/servicepipeSitemap';
import { buildUrlSummaries } from '../analytics/selectors';
import type { LogRow } from '../../shared/types/domain';

type TreeMode = 'weak' | 'empty' | 'active' | 'all';
type PageStatus = 'empty' | 'low' | 'active';

interface SitemapPage {
  path: string;
  title: string;
  url: string;
  total: number;
  lastmod: string;
  status: PageStatus;
}

interface SitemapSection {
  name: string;
  pages: SitemapPage[];
  total: number;
  visibleTotal: number;
  allCount: number;
  active: number;
  empty: number;
  low: number;
  status: PageStatus;
}

const sectionOrder = [
  servicepipeSectionLabels.blog,
  servicepipeSectionLabels.pressCenter,
  servicepipeSectionLabels.news,
  servicepipeSectionLabels.products,
  servicepipeSectionLabels.industries,
  servicepipeSectionLabels.company,
  servicepipeSectionLabels.partners,
  servicepipeSectionLabels.misc,
];

const modeLabels: Record<TreeMode, string> = {
  weak: 'Слабые',
  empty: 'Без запросов',
  active: 'С запросами',
  all: 'Все',
};
const rootSectionName = 'Главная';

export function SiteMapBoard({
  rows,
  robotsTxt: _robotsTxt,
  siteDomain,
  onPathSelect: _onPathSelect,
  pageTitleCatalog,
}: {
  rows: LogRow[];
  robotsTxt: string;
  siteDomain: string;
  onPathSelect: (path: string) => void;
  pageTitleCatalog: PageTitleCatalog;
}) {
  const [mode, setMode] = useState<TreeMode>('all');
  const [query, setQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>(servicepipeSectionLabels.pressCenter);
  const summaries = useMemo(() => buildUrlSummaries(rows, ''), [rows]);
  const summaryByPath = useMemo(() => new Map(summaries.map((item) => [normalizePath(item.path), item])), [summaries]);
  const pages = useMemo(() => {
    const rawPages = servicepipeSitemapEntries.map((entry): SitemapPage => {
      const path = normalizePath(entry.path);
      const total = summaryByPath.get(path)?.total ?? 0;
      const status: PageStatus = total <= 0 ? 'empty' : 'active';
      return {
        path,
        title: displayTitleForPath(path, pageTitleCatalog),
        url: entry.url,
        total,
        lastmod: entry.lastmod,
        status,
      };
    });
    return markRelativeWeakPages(rawPages);
  }, [pageTitleCatalog, summaryByPath]);
  const rootPage = useMemo(() => pages.find((page) => page.path === '/') ?? null, [pages]);

  const sections = useMemo(() => {
    const search = query.trim().toLowerCase();
    const allPagesBySection = new Map<string, SitemapPage[]>();
    const visiblePagesBySection = new Map<string, SitemapPage[]>();
    pages.forEach((page) => {
      if (page.path === '/') return;
      const section = getServicepipeSection(page.path) ?? servicepipeSectionLabels.misc;
      const allList = allPagesBySection.get(section) ?? [];
      allList.push(page);
      allPagesBySection.set(section, allList);
      if (search && !`${page.title} ${page.path}`.toLowerCase().includes(search)) return;
      const visibleList = visiblePagesBySection.get(section) ?? [];
      visibleList.push(page);
      visiblePagesBySection.set(section, visibleList);
    });

    return sectionOrder
      .map((name): SitemapSection => {
        const allSectionPages = allPagesBySection.get(name) ?? [];
        const visibleSectionPages = filterSectionPages(visiblePagesBySection.get(name) ?? [], mode).sort(sortPages);
        const total = allSectionPages.reduce((sum, page) => sum + page.total, 0);
        const visibleTotal = visibleSectionPages.reduce((sum, page) => sum + page.total, 0);
        const active = allSectionPages.filter((page) => page.total > 0).length;
        const empty = allSectionPages.filter((page) => page.status === 'empty').length;
        const low = allSectionPages.filter((page) => page.status === 'low').length;
        return {
          name,
          pages: visibleSectionPages,
          total,
          visibleTotal,
          allCount: allSectionPages.length,
          active,
          empty,
          low,
          status: active === 0 ? 'empty' : empty + low > 0 ? 'low' : 'active',
        };
      })
      .filter((section) => (allPagesBySection.get(section.name) ?? []).length > 0);
  }, [mode, pages, query]);

  const stats = useMemo(() => ({
    total: pages.length,
    active: pages.filter((page) => page.total > 0).length,
    weak: pages.filter((page) => page.status !== 'active').length,
  }), [pages]);

  const selectMode = (nextMode: TreeMode) => {
    setMode(nextMode);
  };
  const activeSection = sections.find((section) => section.name === selectedSection) ?? sections[0] ?? null;
  const visibleRootPage = rootPage && filterSectionPages([rootPage], mode).some((page) => page.path === rootPage.path)
    && (!query.trim() || `${rootPage.title} ${rootPage.path}`.toLowerCase().includes(query.trim().toLowerCase()))
    ? rootPage
    : null;
  const detailSection = selectedSection === rootSectionName
    ? {
      name: rootSectionName,
      pages: visibleRootPage ? [visibleRootPage] : [],
      total: rootPage?.total ?? 0,
      visibleTotal: visibleRootPage?.total ?? 0,
      allCount: rootPage ? 1 : 0,
      active: rootPage && rootPage.total > 0 ? 1 : 0,
      empty: rootPage && rootPage.status === 'empty' ? 1 : 0,
      low: rootPage && rootPage.status === 'low' ? 1 : 0,
      status: rootPage?.status ?? 'empty',
    } satisfies SitemapSection
    : activeSection;

  return (
    <article className="panel sitemap-tree-panel">
      <div className="section-heading sitemap-tree-head">
        <div>
          <h2>Карта сайта Servicepipe</h2>
          <p>Все страницы из sitemap разложены по разделам SP. Слабые страницы считаются относительно своего раздела: внизу списка остаются URL с минимальной активностью и без запросов.</p>
        </div>
        <div className="sitemap-tree-stats" aria-label="Сводка по карте сайта">
          <Stat label="URL в sitemap" value={stats.total} />
          <Stat label="С запросами" value={stats.active} />
          <Stat label="Слабые" value={stats.weak} />
        </div>
      </div>

      <div className="sitemap-tree-controls">
        <div className="popover-search sitemap-tree-search">
          <Search className="h-4 w-4" />
          <input value={query} placeholder="Найти страницу" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="sitemap-tree-tabs" aria-label="Фильтр страниц карты сайта">
          {(Object.keys(modeLabels) as TreeMode[]).map((key) => (
            <button key={key} className={mode === key ? 'active' : ''} type="button" onClick={() => selectMode(key)}>
              {modeLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="sitemap-workbench">
        <div className="sitemap-visual-tree">
          <button className={`sitemap-root-node ${selectedSection === rootSectionName ? 'selected' : ''}`} type="button" aria-pressed={selectedSection === rootSectionName} onClick={() => setSelectedSection(rootSectionName)}>
            <span><Home className="h-4 w-4" /></span>
            <strong>servicepipe.ru</strong>
            <small>{formatNumber(stats.total)} URL в карте</small>
          </button>
          <div className="sitemap-branch-grid">
            {sections.length ? sections.map((section) => (
              <section className={`sitemap-branch ${section.pages.length ? '' : 'no-visible-pages'} ${detailSection?.name === section.name ? 'selected' : ''}`} key={section.name}>
                <button className="sitemap-branch-card" type="button" aria-pressed={detailSection?.name === section.name} onClick={() => setSelectedSection(section.name)}>
                  <span className="sitemap-branch-dot" aria-hidden="true" />
                  <strong>{section.name}</strong>
                  <span>{formatVisibleCount(section.pages.length, section.allCount, mode, query)}</span>
                  <em>{formatNumber(mode === 'all' && !query ? section.total : section.visibleTotal)} запросов</em>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </section>
            )) : (
              <div className="sitemap-tree-empty">По текущим фильтрам страниц не найдено.</div>
            )}
          </div>
        </div>

        {detailSection && (
          <section className="sitemap-section-detail">
            <div className="sitemap-section-detail-head">
              <div>
                <h3>{detailSection.name}</h3>
                <p>{formatVisibleCount(detailSection.pages.length, detailSection.allCount, mode, query)} · {formatNumber(detailSection.visibleTotal)} запросов в выбранном списке</p>
              </div>
              <span>{modeLabels[mode]}</span>
            </div>
            <div className="sitemap-page-tree">
              {detailSection.pages.length ? detailSection.pages.map((page) => (
                <div className={`sitemap-tree-page sitemap-status-${page.status}`} key={page.path}>
                  <span className="sitemap-page-status" aria-hidden="true" />
                  <div className="sitemap-page-copy">
                    <a href={absoluteUrlForPath(page.path, rows, siteDomain || 'servicepipe.ru')} target="_blank" rel="noreferrer" title={page.url}>{page.title}</a>
                    <span>{truncateMiddle(page.path, 128)}</span>
                  </div>
                  <div className="sitemap-page-meta">
                    <strong>{formatNumber(page.total)}</strong>
                    <span>{page.total > 0 ? 'запросов' : 'нет запросов'}</span>
                  </div>
                </div>
              )) : <div className="sitemap-tree-empty inline">В этом разделе нет страниц под выбранный фильтр.</div>}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <small>{label}</small>
      <strong>{formatNumber(value)}</strong>
    </span>
  );
}

function sortPages(first: SitemapPage, second: SitemapPage) {
  if (first.total !== second.total) return second.total - first.total;
  if (first.status !== second.status) return statusRank(first.status) - statusRank(second.status);
  return first.path.localeCompare(second.path, 'ru');
}

function markRelativeWeakPages(pages: SitemapPage[]) {
  const bySection = new Map<string, SitemapPage[]>();
  pages.forEach((page) => {
    const section = getServicepipeSection(page.path) ?? servicepipeSectionLabels.misc;
    bySection.set(section, [...(bySection.get(section) ?? []), page]);
  });

  const weakPaths = new Set<string>();
  bySection.forEach((sectionPages) => {
    const sorted = sectionPages.slice().sort((a, b) => a.total - b.total || a.path.localeCompare(b.path, 'ru'));
    const weakCount = Math.max(1, Math.ceil(sorted.length * 0.33));
    sorted.slice(0, weakCount).forEach((page) => weakPaths.add(page.path));
  });

  return pages.map((page) => {
    if (page.total <= 0) return page;
    const status: PageStatus = weakPaths.has(page.path) ? 'low' : 'active';
    return { ...page, status };
  });
}

function filterSectionPages(pages: SitemapPage[], mode: TreeMode) {
  if (mode === 'all') return pages;
  if (mode === 'empty') return pages.filter((page) => page.status === 'empty');
  if (mode === 'active') return pages.filter((page) => page.total > 0);
  return pages.filter((page) => page.status !== 'active');
}

function formatVisibleCount(visible: number, total: number, mode: TreeMode, query: string) {
  if (mode === 'all' && !query.trim()) return `${formatNumber(total)} URL`;
  return `${formatNumber(visible)} из ${formatNumber(total)} URL`;
}

function statusRank(status: PageStatus) {
  if (status === 'empty') return 0;
  if (status === 'low') return 1;
  return 2;
}
