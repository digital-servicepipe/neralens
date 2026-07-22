import { formatNumber } from '../../../shared/lib/format';
import type { Kpis } from '../../analytics/selectors';
import type { useAnalytics } from '../../analytics/useAnalytics';

type Analytics = ReturnType<typeof useAnalytics>;

export function KpiCards({ kpis, analytics }: { kpis: Kpis; analytics: Analytics }) {
  const cards = [
    ['ЗАПРОСЫ', kpis.totalRequests, 'в текущем срезе'],
    ['ПУТИ', kpis.uniqueUrls, 'уникальные path (пути)'],
    ['ГРУППЫ', analytics.top.botGroups.length, 'крупные группы ботов'],
    ['USER-AGENT', kpis.uniqueAgents, 'уникальные UA в запросах'],
    ['РАЗДЕЛЫ', analytics.top.sections.length, 'видимые разделы сайта'],
    ['ДНИ', kpis.activeDays, 'активные даты'],
  ] as const;

  return (
    <section className="kpi-grid grid gap-3">
      {cards.map(([label, value, hint]) => (
        <article className="kpi-card panel" key={label}>
          <p className="kpi-label">{label}</p>
          <p className="kpi-value">{formatNumber(value)}</p>
          <p className="kpi-hint">{hint}</p>
        </article>
      ))}
    </section>
  );
}
