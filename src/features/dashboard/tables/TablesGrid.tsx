import { formatNumber, formatPercent, truncateMiddle } from '../../../shared/lib/format';
import { Panel } from '../../../shared/ui/Panel';
import type { useAnalytics } from '../../analytics/useAnalytics';

type Analytics = ReturnType<typeof useAnalytics>;

export function TablesGrid({ analytics, onPathSelect }: { analytics: Analytics; onPathSelect: (path: string) => void }) {
  return (
    <div className="grid gap-3" style={{ gridColumn: 'span 2' }}>
      <TopTable title="Статусы запросов" rows={analytics.top.statuses} firstColumn="Статус" />
      <Panel title="Топ URL" subtitle="Самые посещаемые пути в текущем срезе.">
        <div className="table-card">
          <table>
            <thead>
              <tr><th>URL</th><th>Доля</th><th style={{ textAlign: 'right' }}>Запросы</th></tr>
            </thead>
            <tbody>
              {analytics.top.urls.slice(0, 12).map((row) => (
                <tr key={row.label}>
                  <td><button className="text-aqua" type="button" onClick={() => onPathSelect(row.label)}>{truncateMiddle(row.label, 64)}</button></td>
                  <td className="text-muted">{formatPercent(row.share * 100)}</td>
                  <td style={{ textAlign: 'right' }}><b>{formatNumber(row.count)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function TopTable({ title, rows, firstColumn }: { title: string; rows: Array<{ label: string; count: number; share: number }>; firstColumn: string }) {
  return (
    <Panel title={title} subtitle="Что произошло с запросами в текущем срезе.">
      <div className="table-card">
        <table>
          <thead><tr><th>{firstColumn}</th><th>Доля</th><th style={{ textAlign: 'right' }}>Запросы</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={row.label}>
                <td><span className="dot" style={{ display: 'inline-block', marginRight: 8, background: index === 0 ? 'var(--fk-accent)' : 'var(--fk-muted)' }} />{row.label}</td>
                <td className="text-muted">{formatPercent(row.share * 100)}</td>
                <td style={{ textAlign: 'right' }}><b>{formatNumber(row.count)}</b></td>
              </tr>
            )) : <tr><td colSpan={3} className="text-muted">Нет данных в текущем срезе.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
