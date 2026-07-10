import { useMemo } from 'react';
import { emptyFilters, type FiltersState, type LogRow } from '../../shared/types/domain';
import { buildFilterOptions, buildKpis, buildTopLists, buildUrlSummaries, dailySeries, filterRows, hourlySeries } from './selectors';

export function useAnalytics(rows: LogRow[], filters: FiltersState = emptyFilters, robotsTxt = '') {
  const filteredRows = useMemo(() => filterRows(rows, filters), [rows, filters]);
  return useMemo(
    () => ({
      filteredRows,
      kpis: buildKpis(filteredRows, robotsTxt),
      filterOptions: buildFilterOptions(rows),
      daily: dailySeries(filteredRows),
      hourly: hourlySeries(filteredRows, filters.dateFrom, filters.dateTo),
      top: buildTopLists(filteredRows),
      urlSummaries: buildUrlSummaries(filteredRows, robotsTxt),
    }),
    [filteredRows, filters.dateFrom, filters.dateTo, robotsTxt, rows],
  );
}
