import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Info } from 'lucide-react';
import { agentGroupDescriptions, agentGroupLabels, agentGroups, botSignatures, getBotDisplayName } from '../../bots/botDictionary';
import { formatNumber, formatPercent } from '../../../shared/lib/format';
import { displayTitleForPath, type PageTitleCatalog } from '../../../shared/lib/pageTitles';
import { absoluteUrlForPath } from '../../../shared/lib/url';
import type { LogRow } from '../../../shared/types/domain';
import type { useAnalytics } from '../../analytics/useAnalytics';
import { requestCountFor, totalRequestCount } from '../../analytics/selectors';
import { BotTokenList } from '../../bots/BotTokenList';

type Analytics = ReturnType<typeof useAnalytics>;
type RowWithBotName = LogRow & { botName?: string };

function botNameFor(row: RowWithBotName) {
  return row.botName ?? getBotDisplayName(row.botType, row.httpUserAgent);
}

export function OverviewBottom({ analytics, rows, siteDomain, pageTitleCatalog, onPathSelect }: { analytics: Analytics; rows: LogRow[]; siteDomain: string; pageTitleCatalog: PageTitleCatalog; onPathSelect: (path: string) => void }) {
  return (
    <section className="overview-bottom">
      <div className="overview-lower-grid">
        <TopPathsPanel analytics={analytics} rows={rows} siteDomain={siteDomain} pageTitleCatalog={pageTitleCatalog} onPathSelect={onPathSelect} />
        <BotReferenceOverview rows={rows} />
      </div>
    </section>
  );
}

function TopPathsPanel({ analytics, rows, siteDomain, pageTitleCatalog, onPathSelect }: { analytics: Analytics; rows: LogRow[]; siteDomain: string; pageTitleCatalog: PageTitleCatalog; onPathSelect: (path: string) => void }) {
  const [limit, setLimit] = useState(15);
  const shown = analytics.top.urls.slice(0, limit);
  const rowsByPath = useMemo(() => {
    const map = new Map<string, LogRow[]>();
    rows.forEach((row) => {
      const list = map.get(row.path) ?? [];
      list.push(row);
      map.set(row.path, list);
    });
    return map;
  }, [rows]);
  return (
    <article className="panel top-paths-panel">
      <div className="section-heading">
        <div>
          <h2>Топ путей</h2>
          <p>Самые частые страницы в выборке. Ссылку можно открыть или скопировать</p>
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
          const pathRows = rowsByPath.get(item.label) ?? [];
          const title = displayTitleForPath(item.label, pageTitleCatalog);
          const botGroups = new Map<string, Set<LogRow['agentGroup']>>();
          pathRows.forEach((row) => {
            const name = botNameFor(row);
            const groups = botGroups.get(name) ?? new Set<LogRow['agentGroup']>();
            groups.add(row.agentGroup);
            botGroups.set(name, groups);
          });
          const bots = Array.from(botGroups.entries()).map(([name, groups]) => ({ name, groups: Array.from(groups) }));
          const url = absoluteUrlForPath(item.label, pathRows, siteDomain);
          return (
            <div className="path-card" key={item.label}>
              <div className="path-card-main">
                <a className="path-title" href={url} target="_blank" rel="noreferrer">{title}</a>
                <span>{item.label}</span>
                <p><BotTokenList bots={bots} limit={7} /></p>
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
  const total = totalRequestCount(rows) || 1;
  const groupStats = useMemo(() => {
    const stats = new Map<LogRow['agentGroup'], { count: number; active: Set<string> }>();
    agentGroups.forEach((group) => stats.set(group, { count: 0, active: new Set() }));
    rows.forEach((row) => {
      const item = stats.get(row.agentGroup);
      if (!item) return;
      item.count += requestCountFor(row);
      item.active.add(botNameFor(row));
    });
    return stats;
  }, [rows]);

  return (
    <article className="panel bot-ref-panel">
      <div className="section-heading">
        <div>
          <h2><Info className="h-4 w-4" />Справка по группам ИИ-ботов</h2>
          <p>Справочник по 4 основным группам ботов</p>
        </div>
        <span className="mini-counter">{agentGroups.length}<small>групп</small></span>
      </div>
      <div className="bot-ref-list">
        {agentGroups.map((group) => {
          const stats = groupStats.get(group) ?? { count: 0, active: new Set<string>() };
          const active = stats.active;
          const count = stats.count;
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
                <BotTokenList bots={ordered.map((name) => ({ name, groups: [group], active: active.has(name) }))} limit={18} />
              </p>
            </section>
          );
        })}
      </div>
    </article>
  );
}
