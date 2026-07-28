import { useMemo } from 'react';
import { ChartsGrid } from './charts/ChartsGrid';
import { FiltersPanel } from './filters/FiltersPanel';
import { KpiCards } from './kpi/KpiCards';
import { OverviewBottom } from './overview/OverviewBottom';
import { PagesTable } from './tables/PagesTable';
import { SettingsPage } from '../settings/SettingsPage';
import { SiteMapBoard } from '../sitemap-board/SiteMapBoard';
import type { FiltersState, ImportedFileMeta, LogRow, TextFilePayload } from '../../shared/types/domain';
import type { useAnalytics } from '../analytics/useAnalytics';
import { buildPageTitleCatalog } from '../../shared/lib/pageTitles';

type Analytics = ReturnType<typeof useAnalytics>;
type Screen = 'overview' | 'pages' | 'sitemap' | 'settings';

interface DashboardPageProps {
  screen: Screen;
  rows: LogRow[];
  files: ImportedFileMeta[];
  sitemapFiles: TextFilePayload[];
  robotsTxt: string;
  siteDomain: string;
  servicepipeLogs: boolean;
  filters: FiltersState;
  analytics: Analytics;
  analyticsPending: boolean;
  onFiltersChange: React.Dispatch<React.SetStateAction<FiltersState>>;
  onResetFilters: () => void;
  onPathSelect: (path: string) => void;
  onAddLogs: () => void;
  onSitemapUpload: () => void;
  onClearLogs: () => void;
  onServicepipeLogsChange: (value: boolean) => void;
}

export function DashboardPage(props: DashboardPageProps) {
  const pageTitleCatalog = useMemo(
    () => buildPageTitleCatalog(props.sitemapFiles, { includeServicepipeTitles: props.servicepipeLogs }),
    [props.servicepipeLogs, props.sitemapFiles],
  );

  if (props.screen === 'settings') {
    return (
      <SettingsPage
        rows={props.rows}
        files={props.files}
        sitemapFiles={props.sitemapFiles}
        servicepipeLogs={props.servicepipeLogs}
        onAddLogs={props.onAddLogs}
        onSitemapUpload={props.onSitemapUpload}
        onClearLogs={props.onClearLogs}
        onServicepipeLogsChange={props.onServicepipeLogsChange}
      />
    );
  }

  if (props.screen === 'pages') {
    return (
      <div className="view-stack">
        <FiltersPanel filters={props.filters} options={props.analytics.filterOptions} onChange={props.onFiltersChange} onReset={props.onResetFilters} />
        <PagesTable analytics={props.analytics} rows={props.analytics.filteredRows} siteDomain={props.siteDomain} pageTitleCatalog={pageTitleCatalog} onPathSelect={props.onPathSelect} />
      </div>
    );
  }

  if (props.screen === 'sitemap') {
    return (
      <div className="view-stack">
        <FiltersPanel filters={props.filters} options={props.analytics.filterOptions} onChange={props.onFiltersChange} onReset={props.onResetFilters} />
        <SiteMapBoard rows={props.analytics.filteredRows} filters={props.filters} sitemapFiles={props.sitemapFiles} robotsTxt={props.robotsTxt} siteDomain={props.siteDomain} servicepipeLogs={props.servicepipeLogs} onPathSelect={props.onPathSelect} />
      </div>
    );
  }

  return (
    <div className="view-stack">
      <FiltersPanel filters={props.filters} options={props.analytics.filterOptions} onChange={props.onFiltersChange} onReset={props.onResetFilters} />
      <KpiCards kpis={props.analytics.kpis} analytics={props.analytics} />
      <ChartsGrid analytics={props.analytics} />
      <OverviewBottom analytics={props.analytics} rows={props.analytics.filteredRows} siteDomain={props.siteDomain} pageTitleCatalog={pageTitleCatalog} onPathSelect={props.onPathSelect} />
    </div>
  );
}
