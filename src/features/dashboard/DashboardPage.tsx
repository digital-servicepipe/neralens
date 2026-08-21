import { useMemo } from 'react';
import { ChartsGrid } from './charts/ChartsGrid';
import { FiltersPanel } from './filters/FiltersPanel';
import { KpiCards } from './kpi/KpiCards';
import { OverviewBottom } from './overview/OverviewBottom';
import { PagesTable } from './tables/PagesTable';
import { SettingsPage } from '../settings/SettingsPage';
import { IndustryDashboard } from './industry/IndustryDashboard';
import type { AnalysisMode, FiltersState, ImportedFileMeta, IndustryRow, LogRow, TextFilePayload } from '../../shared/types/domain';
import type { useAnalytics } from '../analytics/useAnalytics';
import { buildPageTitleCatalog } from '../../shared/lib/pageTitles';

type Analytics = ReturnType<typeof useAnalytics>;
type Screen = 'overview' | 'pages' | 'settings';

interface DashboardPageProps {
  screen: Screen;
  analysisMode: AnalysisMode;
  rows: LogRow[];
  industryRows: IndustryRow[];
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
  onAddIndustry: () => void;
  onClearLogs: () => void;
  onServicepipeLogsChange: (value: boolean) => void;
  onAnalysisModeChange: (value: AnalysisMode) => void;
}

export function DashboardPage(props: DashboardPageProps) {
  const pageTitleCatalog = useMemo(
    () => buildPageTitleCatalog(props.sitemapFiles, { includeServicepipeTitles: props.servicepipeLogs }),
    [props.servicepipeLogs, props.sitemapFiles],
  );

  if (props.screen === 'settings') {
    return (
      <SettingsPage
        analysisMode={props.analysisMode}
        rows={props.rows}
        industryRows={props.industryRows}
        files={props.files}
        servicepipeLogs={props.servicepipeLogs}
        onAddLogs={props.onAddLogs}
        onAddIndustry={props.onAddIndustry}
        onClearLogs={props.onClearLogs}
        onServicepipeLogsChange={props.onServicepipeLogsChange}
        onAnalysisModeChange={props.onAnalysisModeChange}
      />
    );
  }

  if (props.analysisMode === 'industry') {
    return <IndustryDashboard rows={props.industryRows} />;
  }

  if (props.screen === 'pages') {
    return (
      <div className="view-stack">
        <FiltersPanel filters={props.filters} options={props.analytics.filterOptions} onChange={props.onFiltersChange} onReset={props.onResetFilters} />
        <PagesTable analytics={props.analytics} rows={props.analytics.filteredRows} siteDomain={props.siteDomain} pageTitleCatalog={pageTitleCatalog} onPathSelect={props.onPathSelect} />
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
