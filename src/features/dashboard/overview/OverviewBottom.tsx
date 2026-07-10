import { useState } from 'react';
import { Copy, ExternalLink, Info } from 'lucide-react';
import { agentGroupDescriptions, agentGroupLabels, agentGroups, botSignatures, getBotDisplayName } from '../../bots/botDictionary';
import { formatNumber, formatPercent, truncateMiddle } from '../../../shared/lib/format';
import { absoluteUrlForPath } from '../../../shared/lib/url';
import type { LogRow } from '../../../shared/types/domain';
import type { useAnalytics } from '../../analytics/useAnalytics';

type Analytics = ReturnType<typeof useAnalytics>;

export function OverviewBottom({ analytics, rows, siteDomain, onPathSelect }: { analytics: Analytics; rows: LogRow[]; siteDomain: string; onPathSelect: (path: string) => void }) {
  return (
    <section className="overview-bottom">
      <div className="overview-lower-grid">
        <TopPathsPanel analytics={analytics} rows={rows} siteDomain={siteDomain} onPathSelect={onPathSelect} />
        <BotReferenceOverview rows={rows} />
      </div>
    </section>
  );
}

function TopPathsPanel({ analytics, rows, siteDomain, onPathSelect }: { analytics: Analytics; rows: LogRow[]; siteDomain: string; onPathSelect: (path: string) => void }) {
  const [limit, setLimit] = useState(15);
  const shown = analytics.top.urls.slice(0, limit);
  return (
    <article className="panel top-paths-panel">
      <div className="section-heading">
        <div>
          <h2>Топ путей</h2>
          <p>Самые частые страницы в выборке. Ссылку можно открыть или скопировать.</p>
        </div>
        <div className="limit-tabs">
          {[5, 15, 30, 50].map((value) => (
            <button className={limit === value ? 'active' : ''} onClick={() => setLimit(value)} key={value}>{value}</button>
          ))}
          <button className={limit > 50 ? 'active' : ''} onClick={() => setLimit(analytics.top.urls.length)}>Все</button>
        </div>
      </div>
      <p className="shown-count">Показано {formatNumber(shown.length)} из {formatNumber(analytics.top.urls.length)}</p>
      <div className="path-card-list">
        {shown.map((item) => {
          const pathRows = rows.filter((row) => row.path === item.label);
          const title = item.label === '/' ? 'Главная' : titleFromPathItem(item.label);
          const bots = Array.from(new Set(pathRows.map((row) => getBotDisplayName(row.botType, row.httpUserAgent)))).join(' / ');
          const url = absoluteUrlForPath(item.label, pathRows, siteDomain);
          return (
            <div className="path-card" key={item.label}>
              <div className="path-card-main">
                <a className="path-title" href={url} target="_blank" rel="noreferrer">{title}</a>
                <span>{item.label}</span>
                <p>{truncateMiddle(bots || 'Нет user-agent', 110)}</p>
                <small>{formatNumber(item.count)} запросов</small>
              </div>
              <div className="path-actions">
                <button title="Скопировать" onClick={() => void navigator.clipboard.writeText(url)}><Copy className="h-4 w-4" /></button>
                <a title="Открыть" href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function BotReferenceOverview({ rows }: { rows: LogRow[] }) {
  const total = rows.length || 1;
  return (
    <article className="panel bot-ref-panel">
      <div className="section-heading">
        <div>
          <h2><Info className="h-4 w-4" />Справка по группам ИИ-ботов</h2>
          <p>Справочник по 4 основным группам ИИ-ботов.</p>
        </div>
        <span className="mini-counter">{agentGroups.length}<small>групп</small></span>
      </div>
      <div className="bot-ref-list">
        {agentGroups.map((group) => {
          const active = new Set(rows.filter((row) => row.agentGroup === group).map((row) => getBotDisplayName(row.botType, row.httpUserAgent)));
          const count = rows.filter((row) => row.agentGroup === group).length;
          const ordered = [...Array.from(active), ...botSignatures[group].filter((name) => !active.has(name))];
          return (
            <section className="bot-ref-card" key={group}>
              <div>
                <h3>{agentGroupLabels[group]}</h3>
                <p>{agentGroupDescriptions[group]}</p>
              </div>
              <div className="bot-count">
                <strong>{formatNumber(count)}</strong>
                <span>{formatPercent((count / total) * 100)}</span>
              </div>
              <p className="bot-names">
                {ordered.map((name, index) => (
                  <span className={active.has(name) ? 'active' : ''} key={name}>{index > 0 ? ', ' : ''}{name}</span>
                ))}
              </p>
            </section>
          );
        })}
      </div>
    </article>
  );
}

function titleFromPathItem(path: string): string {
  const last = path.split('/').filter(Boolean).at(-1) ?? path;
  return last.replace(/[-_]+/g, ' ');
}
