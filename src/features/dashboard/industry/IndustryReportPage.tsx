import { useMemo, useState } from 'react';
import type { IndustryRow } from '../../../shared/types/domain';
import { buildIndustrySummaries } from '../../analytics/industrySelectors';
import {
  buildIndustryFilterOptions,
  emptyIndustryFilters,
  filterIndustryRows,
  IndustryFilters,
  IndustryTable,
  type IndustryFiltersState,
} from './IndustryDashboard';

export function IndustryReportPage({ rows }: { rows: IndustryRow[] }) {
  const [filters, setFilters] = useState<IndustryFiltersState>(emptyIndustryFilters);
  const options = useMemo(() => buildIndustryFilterOptions(rows), [rows]);
  const filteredRows = useMemo(() => filterIndustryRows(rows, filters), [filters, rows]);
  const summaries = useMemo(() => buildIndustrySummaries(filteredRows), [filteredRows]);

  return (
    <div className="view-stack industry-dashboard industry-report-page">
      <IndustryFilters filters={filters} options={options} onChange={setFilters} onReset={() => setFilters(emptyIndustryFilters)} showThreats={false} />
      <IndustryTable summaries={summaries} />
    </div>
  );
}
