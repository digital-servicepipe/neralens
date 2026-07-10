import { ChartsGrid } from './charts/ChartsGrid';
import { FiltersPanel } from './filters/FiltersPanel';
import { KpiCards } from './kpi/KpiCards';
import { OverviewBottom } from './overview/OverviewBottom';
import { PagesTable } from './tables/PagesTable';
import { SettingsPage } from '../settings/SettingsPage';
import { SiteMapBoard } from '../sitemap-board/SiteMapBoard';
import type { FiltersState, ImportedFileMeta, LogRow, TextFilePayload } from '../../shared/types/domain';
import type { useAnalytics } from '../analytics/useAnalytics';

type Analytics = ReturnType<typeof useAnalytics>;
type Screen = 'overview' | 'pages' | 'sitemap' | 'settings';

interface DashboardPageProps {
  screen: Screen;
  rows: LogRow[];
  files: ImportedFileMeta[];
  sitemapFiles: TextFilePayload[];
  robotsTxt: string;
  siteDomain: string;
  filters: FiltersState;
  analytics: Analytics;
  onFiltersChange: React.Dispatch<React.SetStateAction<FiltersState>>;
  onResetFilters: () => void;
  onPathSelect: (path: string) => void;
  onSiteDomainChange: (domain: string) => void;
  onAddLogs: () => void;
  onSitemapUpload: () => void;
  onRobotsUpload: () => void;
  onClearLogs: () => void;
}

export function DashboardPage(props: DashboardPageProps) {
  if (props.screen === 'settings') {
    return (
      <SettingsPage
        rows={props.rows}
        files={props.files}
        sitemapFiles={props.sitemapFiles}
        robotsTxt={props.robotsTxt}
        siteDomain={props.siteDomain}
        onSiteDomainChange={props.onSiteDomainChange}
        onAddLogs={props.onAddLogs}
        onSitemapUpload={props.onSitemapUpload}
        onRobotsUpload={props.onRobotsUpload}
        onClearLogs={props.onClearLogs}
      />
    );
  }

  if (props.screen === 'pages') {
    return (
      <div className="view-stack">
        <FiltersPanel filters={props.filters} options={props.analytics.filterOptions} onChange={props.onFiltersChange} onReset={props.onResetFilters} />
        <PagesTable analytics={props.analytics} rows={props.analytics.filteredRows} siteDomain={props.siteDomain} onPathSelect={props.onPathSelect} />
      </div>
    );
  }

  if (props.screen === 'sitemap') {
    return (
      <div className="view-stack">
        <FiltersPanel filters={props.filters} options={props.analytics.filterOptions} onChange={props.onFiltersChange} onReset={props.onResetFilters} />
        <SiteMapBoard rows={props.analytics.filteredRows} filters={props.filters} sitemapFiles={props.sitemapFiles} robotsTxt={props.robotsTxt} siteDomain={props.siteDomain} onPathSelect={props.onPathSelect} />
      </div>
    );
  }

  return (
    <div className="view-stack">
      <FiltersPanel filters={props.filters} options={props.analytics.filterOptions} onChange={props.onFiltersChange} onReset={props.onResetFilters} />
      <KpiCards kpis={props.analytics.kpis} analytics={props.analytics} />
      <ChartsGrid analytics={props.analytics} />
      <OverviewBottom analytics={props.analytics} rows={props.analytics.filteredRows} siteDomain={props.siteDomain} onPathSelect={props.onPathSelect} />
    </div>
  );
}
