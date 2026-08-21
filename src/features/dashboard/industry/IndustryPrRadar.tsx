import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BarChart3, CalendarDays, Gauge, Scale, Target } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCompactNumber, formatNumber, formatPercent } from '../../../shared/lib/format';
import type { IndustryRow } from '../../../shared/types/domain';
import { buildIndustrySummaries, totalIndustryTraffic, weightedAverage, type IndustrySummary } from '../../analytics/industrySelectors';
import { buildIndustryFilterOptions, emptyIndustryFilters, filterIndustryRows, IndustryFilters, type IndustryFiltersState } from './IndustryDashboard';

const grid = 'rgba(255,255,255,.08)';
const axis = { fill: 'var(--fk-muted)', fontSize: 12 };
const riskColor = '#F7632F';
const neutralColor = '#8BBFD7';

type MetricKey =
  | 'badBotsPercent'
  | 'apiPercent'
  | 'parsersPercent'
  | 'credsPercent'
  | 'scanerPercent'
  | 'paymentsCrackPercent'
  | 'smsPushBomberPercent';

const metricLabels: Record<MetricKey, string> = {
  badBotsPercent: 'Вредоносные боты',
  apiPercent: 'API-атаки',
  parsersPercent: 'Активность парсеров',
  credsPercent: 'Подбор учётных данных',
  scanerPercent: 'Сканеры',
  paymentsCrackPercent: 'Подбор платёжных данных',
  smsPushBomberPercent: 'SMS/Push-бомберы',
};

const prMetrics: MetricKey[] = ['badBotsPercent', 'apiPercent', 'parsersPercent', 'credsPercent', 'scanerPercent', 'paymentsCrackPercent', 'smsPushBomberPercent'];

interface IndustryRadarItem {
  industry: string;
  score: number;
  summary: IndustrySummary;
  leadMetric: MetricKey;
  leadValue: number;
  leadCount: number;
  leadVsAverage: number;
  leadRatio: number;
  leadDelta: number;
  peak: {
    date: string;
    metric: MetricKey;
    value: number;
  };
  evidence: string[];
  dynamics: Array<{
    key: MetricKey;
    label: string;
    start: number;
    end: number;
    delta: number;
    peakDate: string;
    peakValue: number;
  }>;
  comparisons: Array<{
    key: MetricKey;
    label: string;
    value: number;
    average: number;
    diff: number;
    ratio: number;
  }>;
}

export function IndustryPrRadar({ rows }: { rows: IndustryRow[] }) {
  const [filters, setFilters] = useState<IndustryFiltersState>(emptyIndustryFilters);
  const filteredRows = useMemo(() => filterIndustryRows(rows, filters), [filters, rows]);
  const filterOptions = useMemo(() => buildIndustryFilterOptions(rows), [rows]);
  const model = useMemo(() => buildPrRadarModel(filteredRows), [filteredRows]);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const selected = model.items.find((item) => item.industry === selectedIndustry) ?? model.items[0];

  useEffect(() => {
    if (!selectedIndustry) return;
    if (!model.items.some((item) => item.industry === selectedIndustry)) setSelectedIndustry('');
  }, [model.items, selectedIndustry]);

  if (!rows.length) {
    return (
      <section className="panel p-6">
        <p className="text-2xl font-extrabold text-ink">Загрузите отраслевой файл</p>
        <p className="mt-2 text-sm text-muted">PR-радар появится после импорта отраслевого CSV/TSV с датой, отраслью, общим трафиком и долями атак.</p>
      </section>
    );
  }

  return (
    <div className="view-stack industry-pr-page">
      <section className="panel pr-hero">
        <div>
          <p className="empty-import-kicker">PR-радар</p>
          <h2>Какие отрасли сильнее выделяются в отчёте</h2>
          <p>Берём строки отраслевого файла по выбранным датам и отраслям. Для каждой отрасли считаем доли атак, примерный объём трафика, отличие от среднего по этому же срезу и изменение за период.</p>
        </div>
        <div className="pr-hero-stats">
          <Info label="Период" value={model.periodLabel} />
          <Info label="Отрасли в срезе" value={formatNumber(model.items.length)} />
          <Info label="Трафик в срезе" value={formatCompactNumber(model.totalTraffic)} />
        </div>
      </section>

      <IndustryFilters filters={filters} options={filterOptions} onChange={setFilters} onReset={() => setFilters(emptyIndustryFilters)} />

      <section className="panel pr-basis-panel">
        <strong>Сейчас считаем по</strong>
        <span>{model.periodLabel}; {formatNumber(model.items.length)} {pluralRu(model.items.length, 'отрасль', 'отрасли', 'отраслей')}; {formatCompactNumber(model.totalTraffic)} общего трафика. Среднее, рейтинг и динамика пересчитываются после каждого фильтра.</span>
      </section>

      <section className="pr-radar-layout">
        <article className="panel pr-industry-list">
          <div className="section-heading">
            <div>
              <h2>Отрасли с отклонениями</h2>
              <p>Сверху отрасли, где доли атак выше среднего по выбранным данным или заметно выросли за период.</p>
            </div>
          </div>
          <div className="pr-industry-stack">
            {model.items.length ? model.items.map((item, index) => (
              <button key={item.industry} className={`pr-industry-card ${selected?.industry === item.industry ? 'active' : ''}`} type="button" onClick={() => setSelectedIndustry(item.industry)}>
                <span className="pr-industry-rank">{index + 1}</span>
                <span className="pr-industry-copy">
                  <strong>{item.industry}</strong>
                  <small>{metricLabels[item.leadMetric]}: {formatPercent(item.leadValue)} · ≈ {formatCompactNumber(item.leadCount)}</small>
                </span>
                <span className="pr-industry-delta">{formatPoints(item.leadVsAverage)}</span>
              </button>
            )) : <p className="settings-empty">В выбранном срезе нет данных. Расширьте период или сбросьте фильтры.</p>}
          </div>
        </article>

        {selected && (
          <article className="panel pr-detail">
            <div className="pr-detail-head">
              <div>
                <p className="empty-import-kicker">Выбранная отрасль</p>
                <h2>{selected.industry}</h2>
                <p>Показываем только расчёты по этой отрасли за выбранный период. Среднее для сравнения берётся из всех отраслей, которые остались после фильтров.</p>
              </div>
              <div className="pr-score">
                <span>Место в радаре</span>
                <strong>{model.items.findIndex((item) => item.industry === selected.industry) + 1}</strong>
              </div>
            </div>

            <div className="pr-fact-grid">
              <FactCard icon={<Gauge className="h-4 w-4" />} label="Самое заметное отклонение" value={metricLabels[selected.leadMetric]} detail={`${formatPercent(selected.leadValue)} · ≈ ${formatCompactNumber(selected.leadCount)}`} tone="risk" />
              <FactCard icon={<Scale className="h-4 w-4" />} label="Разница со средним среза" value={formatPoints(selected.leadVsAverage)} detail={`среднее: ${formatPercent(model.averages[selected.leadMetric])}${selected.leadRatio > 1 ? ` · ${formatRatio(selected.leadRatio)}` : ''}`} />
              <FactCard icon={<CalendarDays className="h-4 w-4" />} label="Максимум за период" value={formatDate(selected.peak.date)} detail={`${metricLabels[selected.peak.metric]}: ${formatPercent(selected.peak.value)}`} />
              <FactCard icon={<Target className="h-4 w-4" />} label="База отрасли" value={formatCompactNumber(selected.summary.totalTraffic)} detail={`${formatNumber(selected.summary.rows)} строк с датами`} />
            </div>

            <div className="pr-section">
              <h3>Что можно безопасно сказать по данным</h3>
              <div className="pr-evidence-list">
                {selected.evidence.map((item) => <p key={item}>{item}</p>)}
              </div>
            </div>

            <div className="pr-section">
              <h3>Что изменилось за выбранный период</h3>
              <div className="pr-dynamics-grid">
                {selected.dynamics.slice(0, 4).map((item) => (
                  <div className="pr-dynamic-card" key={item.key}>
                    <span>{item.label}</span>
                    <strong>{formatPercent(item.start)} → {formatPercent(item.end)}</strong>
                    <small className={item.delta >= 0 ? 'up' : 'down'}>{formatPoints(item.delta)} за период</small>
                    <em>Пик: {formatPercent(item.peakValue)} · {formatDate(item.peakDate)}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="pr-section">
              <h3>Отрасль и среднее по выбранным данным</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={selected.comparisons.slice(0, 5)} layout="vertical" margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={grid} horizontal={false} />
                  <XAxis type="number" tick={axis} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <YAxis dataKey="label" type="category" tick={axis} tickLine={false} width={170} interval={0} />
                  <Tooltip content={<PrTooltip />} cursor={{ fill: 'rgba(255,255,255,.06)' }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ color: 'var(--ui-color-text-secondary)', fontSize: 12, paddingBottom: 8 }} />
                  <Bar dataKey="average" name="Среднее по срезу" radius={[0, 7, 7, 0]} fill={neutralColor} isAnimationActive={false} />
                  <Bar dataKey="value" name={selected.industry} radius={[0, 7, 7, 0]} isAnimationActive={false}>
                    {selected.comparisons.slice(0, 5).map((item) => <Cell key={item.key} fill={item.diff >= 0 ? riskColor : neutralColor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pr-method-note">
              <strong>Что именно считается:</strong> доли берутся из процентных колонок файла и усредняются с весом по all_trafic. Объёмы с ≈ считаются как all_trafic отрасли × доля / 100. Разница и динамика указаны в процентных пунктах.
            </div>
          </article>
        )}
      </section>
    </div>
  );
}

function buildPrRadarModel(rows: IndustryRow[]) {
  const summaries = buildIndustrySummaries(rows);
  const totalTraffic = totalIndustryTraffic(rows);
  const averages = Object.fromEntries(prMetrics.map((key) => [key, weightedAverage(rows, key)])) as Record<MetricKey, number>;
  const maxTraffic = Math.max(...summaries.map((item) => item.totalTraffic), 1);
  const dates = rows.map((row) => row.date).filter((date) => date !== 'Unknown').sort();
  const periodLabel = dates.length ? `${formatDate(dates[0])} - ${formatDate(dates.at(-1) ?? dates[0])}` : 'нет дат';

  const items = summaries.map((summary) => buildRadarItem(summary, rows.filter((row) => row.industry === summary.industry), averages, maxTraffic))
    .sort((a, b) => b.score - a.score);

  return { items, averages, totalTraffic, periodLabel };
}

function buildRadarItem(summary: IndustrySummary, rows: IndustryRow[], averages: Record<MetricKey, number>, maxTraffic: number): IndustryRadarItem {
  const dynamics = prMetrics.map((key) => buildMetricDynamic(rows, key));
  const comparisons = prMetrics.map((key) => {
    const value = Number(summary[key]);
    const average = averages[key] || 0;
    return {
      key,
      label: metricLabels[key],
      value,
      average,
      diff: value - average,
      ratio: average > 0 ? value / average : 0,
    };
  }).sort((a, b) => metricSignal(b, dynamics.find((item) => item.key === b.key)?.delta ?? 0) - metricSignal(a, dynamics.find((item) => item.key === a.key)?.delta ?? 0));
  const lead = comparisons[0] ?? comparisons.find((item) => item.key === 'badBotsPercent')!;
  const leadDynamic = dynamics.find((item) => item.key === lead.key) ?? dynamics[0];
  const peak = dynamics.reduce((best, item) => item.peakValue > best.value ? { date: item.peakDate, metric: item.key, value: item.peakValue } : best, { date: leadDynamic?.peakDate ?? '', metric: lead.key, value: leadDynamic?.peakValue ?? lead.value });
  const positiveDiffs = comparisons.filter((item) => item.diff > 0).slice(0, 3);
  const growth = dynamics.filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta)[0];
  const trafficWeight = Math.log10(summary.totalTraffic + 1) / Math.log10(maxTraffic + 1);
  const score = metricSignal(lead, leadDynamic?.delta ?? 0) + trafficWeight * 14;
  const sortedDynamics = dynamics
    .slice()
    .sort((a, b) => Math.max(Math.abs(b.delta), b.peakValue) - Math.max(Math.abs(a.delta), a.peakValue));

  return {
    industry: summary.industry,
    score,
    summary,
    leadMetric: lead.key,
    leadValue: lead.value,
    leadCount: estimateCount(summary.totalTraffic, lead.value),
    leadVsAverage: lead.diff,
    leadRatio: lead.ratio,
    leadDelta: leadDynamic?.delta ?? 0,
    peak,
    dynamics: sortedDynamics,
    comparisons,
    evidence: buildEvidence(summary, lead, leadDynamic, positiveDiffs, growth),
  };
}

function metricSignal(metric: { value: number; diff: number; ratio: number }, delta: number) {
  const ratioBonus = metric.ratio > 1 ? Math.min(metric.ratio, 5) * 2 : 0;
  return Math.max(0, metric.value) * 1.1 + Math.max(0, metric.diff) * 2.6 + Math.max(0, delta) * 1.8 + ratioBonus;
}

function buildMetricDynamic(rows: IndustryRow[], key: MetricKey) {
  const byDate = new Map<string, IndustryRow[]>();
  rows.forEach((row) => {
    if (!row.date || row.date === 'Unknown') return;
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  });
  const points = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayRows]) => ({ date, value: weightedAverage(dayRows, key) }));
  const first = points[0];
  const last = points.at(-1);
  const peak = points.reduce((best, point) => point.value > best.value ? point : best, first ?? { date: '', value: 0 });

  return {
    key,
    label: metricLabels[key],
    start: first?.value ?? 0,
    end: last?.value ?? 0,
    delta: (last?.value ?? 0) - (first?.value ?? 0),
    peakDate: peak.date,
    peakValue: peak.value,
  };
}

function buildEvidence(
  summary: IndustrySummary,
  lead: { key: MetricKey; label: string; value: number; average: number; diff: number; ratio: number },
  leadDynamic: { start: number; end: number; delta: number; peakDate: string; peakValue: number } | undefined,
  positiveDiffs: Array<{ key: MetricKey; label: string; value: number; average: number; diff: number; ratio: number }>,
  growth: { label: string; start: number; end: number; delta: number; peakDate: string; peakValue: number } | undefined,
) {
  const lines = [
    `${lead.label}: в отрасли ${formatPercent(lead.value)}, среднее по выбранным отраслям и датам — ${formatPercent(lead.average)}. Разница: ${formatPoints(lead.diff)}${lead.ratio > 1 ? ` (${formatRatio(lead.ratio)})` : ''}.`,
    `В абсолютных числах это примерно ${formatCompactNumber(estimateCount(summary.totalTraffic, lead.value))} из ${formatCompactNumber(summary.totalTraffic)} общего трафика отрасли.`,
  ];
  if (leadDynamic) {
    lines.push(`По динамике: в начале выбранного периода было ${formatPercent(leadDynamic.start)}, в конце — ${formatPercent(leadDynamic.end)}. Изменение: ${formatPoints(leadDynamic.delta)}. Максимум за период: ${formatPercent(leadDynamic.peakValue)} ${formatDate(leadDynamic.peakDate)}.`);
  }
  const secondSignal = positiveDiffs.find((item) => item.key !== lead.key);
  if (secondSignal) {
    lines.push(`Ещё одно отклонение: ${secondSignal.label} выше среднего по выбранным данным на ${formatPoints(secondSignal.diff)}.`);
  } else if (growth && growth.delta > 0) {
    lines.push(`Ещё одно изменение: ${growth.label} выросли на ${formatPoints(growth.delta)} за выбранный период.`);
  }
  return lines;
}

function estimateCount(traffic: number, percent: number) {
  return Math.round((traffic * percent) / 100);
}

function formatPoints(value: number) {
  if (Math.abs(value) < 0.05) return '0 п.п.';
  const sign = value > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0 }).format(value);
  return `${sign}${formatted} п.п.`;
}

function formatRatio(value: number) {
  return `в ${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} раза выше`;
}

function formatDate(value: string) {
  if (!value) return 'нет даты';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-box">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function FactCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone?: 'risk' }) {
  return (
    <div className={`pr-fact-card ${tone ?? ''}`}>
      <span aria-hidden="true">{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}

function PrTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip pr-compare-tooltip">
      <p>{item.label}</p>
      <div className="pr-tooltip-line">
        <span>Отрасль</span>
        <strong>{formatPercent(item.value)}</strong>
      </div>
      <div className="pr-tooltip-line">
        <span>Среднее по срезу</span>
        <strong>{formatPercent(item.average)}</strong>
      </div>
      <div className="pr-tooltip-line muted">
        <span>Разница</span>
        <strong>{formatPoints(item.diff)}</strong>
      </div>
    </div>
  );
}

function pluralRu(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
