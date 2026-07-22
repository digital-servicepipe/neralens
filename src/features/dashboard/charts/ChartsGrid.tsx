import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { agentGroupLabels, getBotColor, getBotDisplayName } from '../../bots/botDictionary';
import { agentGroupChartColors, chartColors } from '../../../shared/theme/tokens';
import { Panel } from '../../../shared/ui/Panel';
import { formatNumber, formatPercent, truncateMiddle } from '../../../shared/lib/format';
import type { useAnalytics } from '../../analytics/useAnalytics';
import { requestCountFor } from '../../analytics/selectors';
import type { AgentGroup, LogRow } from '../../../shared/types/domain';

type Analytics = ReturnType<typeof useAnalytics>;
type DailyChartMode = 'groups' | 'ua';
type TimeGrain = 'day' | 'week' | 'month';
type RowWithBotName = LogRow & { botName?: string };

const axis = { fill: 'var(--fk-muted)', fontSize: 12 };
const grid = 'rgba(255,255,255,.08)';
const chartBarCursor = { fill: 'rgba(255,255,255,.075)' };
const chartLineCursor = { stroke: 'rgba(255,255,255,.18)', strokeWidth: 1 };

function botNameFor(row: RowWithBotName) {
  return row.botName ?? getBotDisplayName(row.botType, row.httpUserAgent);
}

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visibleItems = payload
    .filter((item: any) => Number(item.value) > 0)
    .sort((a: any, b: any) => Number(b.value) - Number(a.value));
  if (!visibleItems.length) return null;
  const tooltipTotal = visibleItems.reduce((sum: number, item: any) => sum + Number(item.value), 0) || 1;

  return (
    <div className="chart-tooltip">
      <p>{label}</p>
      <div className="chart-tooltip-metrics-head" aria-hidden="true">
        <span>Запросы</span>
        <span>Доля</span>
      </div>
      {visibleItems.map((item: any, index: number) => {
        const color = getTooltipColor(item);
        const share = typeof item.payload?.share === 'number' ? item.payload.share : Number(item.value) / tooltipTotal;

        return (
          <div key={`${item.name}-${index}`} className="chart-tooltip-item">
          <div className="chart-tooltip-row">
            <span className="chart-tooltip-label">
            <i style={{ backgroundColor: color }} />
            {item.name}
            </span>
            <span className="chart-tooltip-metrics" aria-label={`${formatNumber(Number(item.value))} запросов, доля ${formatPercent(share * 100)}`}>
              <span>{formatNumber(Number(item.value))}</span>
              <span>{formatPercent(share * 100)}</span>
            </span>
          </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartsGrid({ analytics }: { analytics: Analytics }) {
  const [dailyMode, setDailyMode] = useState<DailyChartMode>('groups');
  const [timeGrain, setTimeGrain] = useState<TimeGrain>('day');
  const groups = Array.from(new Set(analytics.filteredRows.map((row) => row.agentGroup)));
  const agentGroupByName = analytics.filteredRows.reduce<Record<string, AgentGroup[]>>((map, row) => {
    const name = botNameFor(row);
    if (!map[name]) map[name] = [];
    if (!map[name].includes(row.agentGroup)) map[name].push(row.agentGroup);
    return map;
  }, {});
  const topDailyAgents = useMemo(() => analytics.top.agents.slice(0, 6).map((item) => item.label), [analytics.top.agents]);
  const groupDaily = useMemo(() => buildGroupTimeSeries(analytics.filteredRows, timeGrain), [analytics.filteredRows, timeGrain]);
  const agentDaily = useMemo(() => buildAgentTimeSeries(analytics.filteredRows, topDailyAgents, timeGrain), [analytics.filteredRows, topDailyAgents, timeGrain]);
  const dailyKeys = dailyMode === 'groups' ? groups : topDailyAgents;
  const rawDailyData = dailyMode === 'groups' ? groupDaily : agentDaily;
  const dailyData = useMemo(() => fillMissingDailyValues(rawDailyData, dailyKeys), [dailyKeys, rawDailyData]);
  const timeGrainLabel = getTimeGrainLabel(timeGrain);
  const dailySubtitle = dailyMode === 'groups'
    ? `Группы AI-ботов в динамике ${timeGrainLabel}`
    : `Топ-5 user-agent в динамике ${timeGrainLabel}`;
  const groupBars = analytics.top.botGroups.map((item) => ({
    ...item,
    name: agentGroupLabels[item.label as keyof typeof agentGroupLabels] ?? item.label,
    color: getAgentGroupColor(item.label),
  }));
  const agentBars = analytics.top.agents.map((item) => ({
    ...item,
    name: truncateMiddle(item.label, 18),
    color: getBotColor(item.label, agentGroupByName[item.label]),
  }));
  const sectionBars = analytics.top.sections.slice(0, 10).map((item, index) => ({
    ...item,
    name: item.label,
    color: chartColors[index % chartColors.length],
  }));
  const statusBars = analytics.top.statuses.map((item) => ({
    ...item,
    name: truncateMiddle(item.label, 18),
    color: getStatusColor(item.label),
  }));

  return (
    <section className="grid gap-3">
      <div className="chart-grid grid gap-3">
        <Panel
          title={`Запросы ${timeGrainLabel}`}
          subtitle={dailySubtitle}
          bodyClassName="height-chart"
          action={<DailyChartControls mode={dailyMode} grain={timeGrain} onModeChange={setDailyMode} onGrainChange={setTimeGrain} />}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dailyData} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
              <defs>
                {dailyKeys.map((key) => {
                  const color = getDailySeriesColor(key, dailyMode, agentGroupByName[key]);
                  return (
                  <linearGradient key={key} id={`daily-${safeGradientId(key)}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.34} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipBox />} cursor={chartLineCursor} />
              {dailyKeys.map((key) => {
                const color = getDailySeriesColor(key, dailyMode, agentGroupByName[key]);
                const name = dailyMode === 'groups' ? agentGroupLabels[key as AgentGroup] : truncateMiddle(key, 24);
                return (
                  <Area key={key} dataKey={key} name={name} type="monotone" stroke={color} fill={`url(#daily-${safeGradientId(key)})`} strokeWidth={2.25} isAnimationActive={false} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <SmallBar title="Разделы сайта" subtitle="Топ-10 разделов по количеству запросов" data={sectionBars} height={320} yAxisWidth={142} showAllLabels />
      </div>
      <div className="three-grid grid gap-3">
        <SmallBar title="Группы ботов" subtitle="Соотношение запросов по группам ботовы" data={groupBars} />
        <SmallBar title="Топ-10 user-agent" subtitle="Какие user-agent'ы делают больше запросов" data={agentBars} height={300} />
        <SmallBar title="Статусы запросов" subtitle="Статистика пропущенных и заблокированных запросов к ресурсу" data={statusBars} />
      </div>
    </section>
  );
}

function DailyChartControls({
  mode,
  grain,
  onModeChange,
  onGrainChange,
}: {
  mode: DailyChartMode;
  grain: TimeGrain;
  onModeChange: (value: DailyChartMode) => void;
  onGrainChange: (value: TimeGrain) => void;
}) {
  return (
    <div className="daily-chart-controls">
      <TimeGrainToggle value={grain} onChange={onGrainChange} />
      <DailyModeToggle value={mode} onChange={onModeChange} />
    </div>
  );
}

function TimeGrainToggle({ value, onChange }: { value: TimeGrain; onChange: (value: TimeGrain) => void }) {
  return (
    <div className="chart-mode-toggle chart-period-toggle" aria-label="Период графика запросов">
      <button type="button" className={value === 'day' ? 'active' : ''} onClick={() => onChange('day')}>
        Дни
      </button>
      <button type="button" className={value === 'week' ? 'active' : ''} onClick={() => onChange('week')}>
        Недели
      </button>
      <button type="button" className={value === 'month' ? 'active' : ''} onClick={() => onChange('month')}>
        Месяцы
      </button>
    </div>
  );
}

function DailyModeToggle({ value, onChange }: { value: DailyChartMode; onChange: (value: DailyChartMode) => void }) {
  return (
    <div className="chart-mode-toggle" aria-label="Режим графика запросов по дням">
      <button type="button" className={value === 'groups' ? 'active' : ''} onClick={() => onChange('groups')}>
        Группы AI
      </button>
      <button type="button" className={value === 'ua' ? 'active' : ''} onClick={() => onChange('ua')}>
        UA
      </button>
    </div>
  );
}

function getAgentGroupColor(group: string) {
  return agentGroupChartColors[group as AgentGroup] ?? chartColors[0];
}

function getDailySeriesColor(key: string, mode: DailyChartMode, knownGroups?: AgentGroup[]) {
  return mode === 'groups' ? getAgentGroupColor(key) : getBotColor(key, knownGroups);
}

function getTooltipColor(item: any) {
  return item.color || item.payload?.color || item.fill || item.stroke || chartColors[0];
}

function getStatusColor(status: string) {
  return status.trim().toLowerCase() === 'pass' ? '#01cdcb' : '#f7632f';
}

function buildGroupTimeSeries(rows: LogRow[], grain: TimeGrain) {
  return buildTimeSeries(rows, grain, (row) => row.agentGroup);
}

function buildAgentTimeSeries(rows: LogRow[], agents: string[], grain: TimeGrain) {
  const selectedAgents = new Set(agents);

  return buildTimeSeries(rows, grain, (row) => {
    const name = botNameFor(row);
    return selectedAgents.has(name) ? name : null;
  });
}

function buildTimeSeries(rows: LogRow[], grain: TimeGrain, getKey: (row: LogRow) => string | null) {
  const byDate = new Map<string, Record<string, number>>();
  const labels = new Map<string, string>();

  rows.forEach((row) => {
    if (!row.date || row.date === 'Unknown') return;
    const key = getKey(row);
    if (!key) return;
    const bucket = getTimeBucket(row.date, grain);
    const counts = byDate.get(bucket.key) ?? {};
    counts[key] = (counts[key] ?? 0) + requestCountFor(row);
    byDate.set(bucket.key, counts);
    labels.set(bucket.key, bucket.label);
  });

  return Array.from(byDate.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, counts]) => ({
      date,
      label: labels.get(date) ?? date,
      ...counts,
    }));
}

function getTimeBucket(dateValue: string, grain: TimeGrain) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { key: dateValue, label: dateValue };

  if (grain === 'month') {
    const year = date.getFullYear();
    const month = date.getMonth();
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
    };
  }

  if (grain === 'week') {
    const monday = getWeekStart(date);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      key: formatDateKey(monday),
      label: `${monday.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}-${sunday.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`,
    };
  }

  return {
    key: dateValue,
    label: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
  };
}

function getWeekStart(date: Date) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getTimeGrainLabel(grain: TimeGrain) {
  if (grain === 'week') return 'по неделям';
  if (grain === 'month') return 'по месяцам';
  return 'по дням';
}

function fillMissingDailyValues<T extends { date: string; label: string }>(data: T[], keys: string[]) {
  return data.map((item) => {
    const filled: Record<string, string | number> = { ...item };
    keys.forEach((key) => {
      if (typeof filled[key] !== 'number') filled[key] = 0;
    });
    return filled;
  });
}

function safeGradientId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function YAxisTick({ x, y, payload }: any) {
  return (
    <text x={x} y={y} dy={4} fill="var(--fk-muted)" fontSize={12} textAnchor="end">
      <title>{payload.value}</title>
      {payload.value}
    </text>
  );
}

function SmallBar({ title, subtitle, data, valueKey = 'count', height = 260, yAxisWidth = 118, showAllLabels = true }: { title: string; subtitle: string; data: Array<{ name: string; count: number; share?: number; color: string }>; valueKey?: string; height?: number; yAxisWidth?: number; showAllLabels?: boolean }) {
  return (
    <Panel title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={grid} horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} allowDecimals={false} domain={[0, 'dataMax']} />
          <YAxis dataKey="name" type="category" tick={<YAxisTick />} tickLine={false} width={yAxisWidth} interval={showAllLabels ? 0 : undefined} />
          <Tooltip content={<TooltipBox />} cursor={chartBarCursor} />
          <Bar dataKey={valueKey} name="Запросы" radius={[0, 8, 8, 0]} isAnimationActive={false}>
            {data.map((item) => <Cell key={item.name} fill={item.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
