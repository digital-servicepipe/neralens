import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { formatNumber, formatPercent, truncateMiddle } from '../../../shared/lib/format';
import { displayTitleForPath, type PageTitleCatalog } from '../../../shared/lib/pageTitles';
import { absoluteUrlForPath } from '../../../shared/lib/url';
import type { LogRow } from '../../../shared/types/domain';
import type { useAnalytics } from '../../analytics/useAnalytics';
import { BotTokenList } from '../../bots/BotTokenList';
import { getBotDisplayName } from '../../bots/botDictionary';

type Analytics = ReturnType<typeof useAnalytics>;

const limits = [10, 25, 50] as const;

export function PagesTable({
  analytics,
  rows: sourceRows,
  siteDomain,
  pageTitleCatalog,
  compact = false,
}: {
  analytics: Analytics;
  rows: LogRow[];
  siteDomain: string;
  pageTitleCatalog: PageTitleCatalog;
  onPathSelect: (path: string) => void;
  compact?: boolean;
}) {
  const [limit, setLimit] = useState<number | 'all'>(compact ? 10 : 50);
  const summaries = analytics.urlSummaries;
  const shown = summaries.slice(0, limit === 'all' ? summaries.length : limit);
  const total = analytics.filteredRows.length || 1;
  const sectionCount = new Set(analytics.filteredRows.map((row) => row.section)).size;

  return (
    <article className="panel pages-panel">
      <div className="pages-head">
        <div>
          <h2>Пути и запросы</h2>
          <p>Какие URL и разделы реально попали в рабочий контур AI-ботов.</p>
        </div>
        <div className="pages-limit-tabs" aria-label="Количество строк">
          <span>Показать</span>
          {limits.map((value) => (
            <button className={limit === value ? 'active' : ''} type="button" onClick={() => setLimit(value)} key={value}>
              {value}
            </button>
          ))}
          <button className={limit === 'all' ? 'active' : ''} type="button" onClick={() => setLimit('all')}>
            Все
          </button>
        </div>
      </div>

      <div className="pages-stats">
        <StatCard label="Пути" value={summaries.length} />
        <StatCard label="Запросы" value={analytics.filteredRows.length} />
        <StatCard label="Разделы" value={sectionCount} />
      </div>

      <div className="pages-table-wrap">
        <table className="pages-table">
          <thead>
            <tr>
              <th>Путь</th>
              <th>Запросы ↓</th>
              <th>Доля</th>
              <th>User-agent</th>
            </tr>
          </thead>
          <tbody>
            {shown.length ? shown.map((row) => {
              const pathRows = sourceRows.filter((item) => item.path === row.path);
              const url = absoluteUrlForPath(row.path, pathRows, siteDomain);
              const bots = Object.keys(row.bots).map((name) => ({
                name,
                groups: Array.from(new Set(pathRows.filter((item) => getBotDisplayName(item.botType, item.httpUserAgent) === name).map((item) => item.agentGroup))),
              }));

              return (
                <tr key={row.path}>
                  <td>
                    <div className="pages-path-cell">
                      <div className="pages-path-copy">
                        <a className="path-link pages-path-title" href={url} target="_blank" rel="noreferrer" title={url}>
                          {displayTitleForPath(row.path, pageTitleCatalog)}
                        </a>
                        <span>{truncateMiddle(row.path, 74)}</span>
                      </div>
                      <div className="pages-row-actions">
                        <button type="button" title="Скопировать URL" onClick={() => void navigator.clipboard.writeText(url)}>
                          <Copy className="h-4 w-4" />
                        </button>
                        <a href={url} target="_blank" rel="noreferrer" title="Открыть URL">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td><strong>{formatNumber(row.total)}</strong></td>
                  <td>
                    <strong>{formatPercent((row.total / total) * 100)}</strong>
                    <span>от текущего среза</span>
                  </td>
                  <td className="pages-agents"><BotTokenList bots={bots} limit={7} /></td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="muted-cell">Нет данных в текущем срезе.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="pages-stat-card">
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}
