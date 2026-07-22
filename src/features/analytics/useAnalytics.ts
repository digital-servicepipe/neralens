import { useMemo } from 'react';
import { emptyFilters, type FiltersState, type LogRow } from '../../shared/types/domain';
import { buildFilterOptions, buildKpis, buildTopLists, buildUrlSummaries, dailySeries, filterRows, hourlySeries, refineSections } from './selectors';

export function useAnalytics(rows: LogRow[], filters: FiltersState = emptyFilters, robotsTxt = '', screen = 'overview') {
  const refinedRows = useMemo(() => refineSections(rows), [rows]);
  const filteredRows = useMemo(() => filterRows(refinedRows, filters), [refinedRows, filters]);
  const filterOptions = useMemo(() => buildFilterOptions(refinedRows), [refinedRows]);
  const kpis = useMemo(() => buildKpis(filteredRows, robotsTxt), [filteredRows, robotsTxt]);
  const daily = useMemo(() => dailySeries(filteredRows), [filteredRows]);
  const hourly = useMemo(() => hourlySeries(filteredRows, filters.dateFrom, filters.dateTo), [filteredRows, filters.dateFrom, filters.dateTo]);
  const top = useMemo(() => buildTopLists(filteredRows), [filteredRows]);
  const urlSummaries = useMemo(() => (screen === 'pages' ? buildUrlSummaries(filteredRows, robotsTxt) : []), [filteredRows, robotsTxt, screen]);

  return useMemo(
    () => ({ filteredRows, kpis, filterOptions, daily, hourly, top, urlSummaries }),
    [daily, filteredRows, filterOptions, hourly, kpis, top, urlSummaries],
  );
}
