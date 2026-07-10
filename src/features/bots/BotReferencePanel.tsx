import { Info } from 'lucide-react';
import { agentGroupDescriptions, agentGroupLabels, agentGroups, botSignatures, getBotDisplayName } from './botDictionary';
import { formatNumber, formatPercent } from '../../shared/lib/format';
import { Panel } from '../../shared/ui/Panel';
import type { LogRow } from '../../shared/types/domain';

export function BotReferencePanel({ rows }: { rows: LogRow[] }) {
  const total = rows.length || 1;
  return (
    <Panel title="Справка по группам AI-ботов" subtitle="Справочник по 4 основным группам AI-ботов." action={<Info className="h-4 w-4 text-aqua" />}>
      <div className="grid gap-3">
        {agentGroups.map((group) => {
          const active = new Set(rows.filter((row) => row.agentGroup === group).map((row) => getBotDisplayName(row.botType, row.httpUserAgent)));
          const count = rows.filter((row) => row.agentGroup === group).length;
          const ordered = [...Array.from(active).map((name) => ({ name, active: true })), ...botSignatures[group].filter((name) => !active.has(name)).map((name) => ({ name, active: false }))];
          return (
            <section className="bg-surface p-3" style={{ border: '1px solid var(--fk-border)', borderRadius: 8 }} key={group}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-ink"><span className="text-aqua">{agentGroupLabels[group]}</span></h3>
                  <p className="mt-1 text-xs text-muted">{agentGroupDescriptions[group]}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="text-sm font-extrabold text-aqua">{formatNumber(count)}</p>
                  <p className="text-xs font-bold text-muted">{formatPercent((count / total) * 100)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted" style={{ lineHeight: 1.8 }}>
                {ordered.map((item, index) => (
                  <span key={item.name}>{index > 0 ? ', ' : ''}<span className={item.active ? 'font-bold text-aqua' : ''}>{item.name}</span></span>
                ))}
              </p>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
