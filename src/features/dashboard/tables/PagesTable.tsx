import { formatNumber, formatPercent, truncateMiddle } from '../../../shared/lib/format';
import { absoluteUrlForPath } from '../../../shared/lib/url';
import type { LogRow } from '../../../shared/types/domain';
import type { useAnalytics } from '../../analytics/useAnalytics';

type Analytics = ReturnType<typeof useAnalytics>;

export function PagesTable({ analytics, rows: sourceRows, siteDomain, compact = false }: { analytics: Analytics; rows: LogRow[]; siteDomain: string; onPathSelect: (path: string) => void; compact?: boolean }) {
  const rows = analytics.top.urls.slice(0, compact ? 12 : 80);
  return (
    <article className="panel metric-table-panel">
      <div className="section-heading">
        <div>
          <h2>{compact ? 'Страницы' : 'Пути и страницы'}</h2>
          <p>{compact ? 'Самые посещаемые URL в текущем срезе.' : 'Детальный список путей, найденных в логах.'}</p>
        </div>
        <span className="mini-counter">{formatNumber(rows.length)}</span>
      </div>
      <div className="table-card reference-table">
        <table>
          <thead>
            <tr>
              <th>Путь</th>
              <th>Доля</th>
              <th>Раздел</th>
              <th style={{ textAlign: 'right' }}>Запросы</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => {
              const pathRows = sourceRows.filter((item) => item.path === row.label);
              const section = pathRows[0]?.section ?? '';
              const url = absoluteUrlForPath(row.label, pathRows, siteDomain);
              return (
                <tr key={row.label}>
                  <td>
                    <a className="path-link" href={url} target="_blank" rel="noreferrer" title={url}>
                      {truncateMiddle(row.label, 88)}
                    </a>
                  </td>
                  <td className="muted-cell">{formatPercent(row.share * 100)}</td>
                  <td className="muted-cell">{section}</td>
                  <td style={{ textAlign: 'right' }}><b>{formatNumber(row.count)}</b></td>
                </tr>
              );
            }) : <tr><td colSpan={4} className="muted-cell">Нет данных в текущем срезе.</td></tr>}
          </tbody>
        </table>
      </div>
    </article>
  );
}
