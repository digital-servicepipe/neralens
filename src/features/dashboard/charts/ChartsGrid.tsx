import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { agentGroupLabels, getBotColor, getBotDisplayName } from '../../bots/botDictionary';
import { agentGroupChartColors, chartColors } from '../../../shared/theme/tokens';
import { Panel } from '../../../shared/ui/Panel';
import { formatNumber, formatPercent, truncateMiddle } from '../../../shared/lib/format';
import type { useAnalytics } from '../../analytics/useAnalytics';
import type { AgentGroup, LogRow } from '../../../shared/types/domain';

type Analytics = ReturnType<typeof useAnalytics>;
type DailyChartMode = 'groups' | 'ua';

const axis = { fill: 'var(--fk-muted)', fontSize: 12 };
const grid = 'rgba(255,255,255,.08)';

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
            <b>{formatNumber(Number(item.value))} / {formatPercent(share * 100)}</b>
          </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartsGrid({ analytics }: { analytics: Analytics }) {
  const [dailyMode, setDailyMode] = useState<DailyChartMode>('groups');
  const groups = Array.from(new Set(analytics.filteredRows.map((row) => row.agentGroup)));
  const agentGroupByName = analytics.filteredRows.reduce<Record<string, AgentGroup[]>>((map, row) => {
    const name = getBotDisplayName(row.botType, row.httpUserAgent);
    if (!map[name]) map[name] = [];
    if (!map[name].includes(row.agentGroup)) map[name].push(row.agentGroup);
    return map;
  }, {});
  const topDailyAgents = useMemo(() => analytics.top.agents.slice(0, 6).map((item) => item.label), [analytics.top.agents]);
  const agentDaily = useMemo(() => buildDailyAgentSeries(analytics.filteredRows, topDailyAgents), [analytics.filteredRows, topDailyAgents]);
  const dailyKeys = dailyMode === 'groups' ? groups : topDailyAgents;
  const dailyData = dailyMode === 'groups' ? analytics.daily : agentDaily;
  const dailySubtitle = dailyMode === 'groups'
    ? 'Группы AI-ботов в динамике по дням'
    : 'Топ-5 user-agent в динамике по дням';
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
    name: truncateMiddle(item.label, 16),
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
          title="Запросы по дням"
          subtitle={dailySubtitle}
          bodyClassName="height-chart"
          action={<DailyModeToggle value={dailyMode} onChange={setDailyMode} />}
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
              <Tooltip content={<TooltipBox />} />
              {dailyKeys.map((key) => {
                const color = getDailySeriesColor(key, dailyMode, agentGroupByName[key]);
                const name = dailyMode === 'groups' ? agentGroupLabels[key as AgentGroup] : truncateMiddle(key, 24);
                return (
                  <Area key={key} dataKey={key} name={name} type="monotone" stroke={color} fill={`url(#daily-${safeGradientId(key)})`} strokeWidth={2.25} isAnimationActive={false} />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <SmallBar title="Разделы сайта" subtitle="Топ-10 разделов по количеству запросов." data={sectionBars} height={300} showAllLabels />
      </div>
      <div className="three-grid grid gap-3">
        <SmallBar title="Группы ботов" subtitle="Кто даёт основной поток." data={groupBars} />
        <SmallBar title="Топ-10 user-agent" subtitle="Какие ИИ-боты встречаются чаще всего." data={agentBars} />
        <SmallBar title="Статусы запросов" subtitle="Статистика пропущенных и заблокированных запросов" data={statusBars} />
      </div>
    </section>
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

function buildDailyAgentSeries(rows: LogRow[], agents: string[]) {
  const selectedAgents = new Set(agents);
  const days = Array.from(new Set(rows.map((row) => row.date).filter((date) => date !== 'Unknown'))).sort();

  return days.map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const counts = dayRows.reduce<Record<string, number>>((map, row) => {
      const name = getBotDisplayName(row.botType, row.httpUserAgent);
      if (selectedAgents.has(name)) map[name] = (map[name] ?? 0) + 1;
      return map;
    }, {});

    return {
      date,
      label: new Date(`${date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      ...counts,
    };
  });
}

function safeGradientId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function SmallBar({ title, subtitle, data, valueKey = 'count', height = 260, showAllLabels = false }: { title: string; subtitle: string; data: Array<{ name: string; count: number; share?: number; color: string }>; valueKey?: string; height?: number; showAllLabels?: boolean }) {
  return (
    <Panel title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 74 }}>
          <CartesianGrid stroke={grid} horizontal={false} />
          <XAxis type="number" tick={axis} axisLine={false} allowDecimals={false} />
          <YAxis dataKey="name" type="category" tick={axis} tickLine={false} width={118} interval={showAllLabels ? 0 : undefined} />
          <Tooltip content={<TooltipBox />} />
          <Bar dataKey={valueKey} name="Запросы" radius={[0, 8, 8, 0]} isAnimationActive={false}>
            {data.map((item) => <Cell key={item.name} fill={item.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
