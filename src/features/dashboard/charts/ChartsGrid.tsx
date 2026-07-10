import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { agentGroupLabels } from '../../bots/botDictionary';
import { agentGroupChartColors, chartColors } from '../../../shared/theme/tokens';
import { Panel } from '../../../shared/ui/Panel';
import { formatNumber, truncateMiddle } from '../../../shared/lib/format';
import type { useAnalytics } from '../../analytics/useAnalytics';
import type { AgentGroup } from '../../../shared/types/domain';

type Analytics = ReturnType<typeof useAnalytics>;

const axis = { fill: 'var(--fk-muted)', fontSize: 12 };
const grid = 'rgba(255,255,255,.08)';

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const visibleItems = payload.filter((item: any) => Number(item.value) > 0);
  if (!visibleItems.length) return null;

  return (
    <div className="chart-tooltip">
      <p>{label}</p>
      {visibleItems.map((item: any) => (
        <div key={item.name} className="chart-tooltip-row">
          <span className="chart-tooltip-label">
            <i style={{ backgroundColor: getTooltipColor(item) }} />
            {item.name}
          </span>
          <b>{formatNumber(Number(item.value))}</b>
        </div>
      ))}
    </div>
  );
}

export function ChartsGrid({ analytics }: { analytics: Analytics }) {
  const groups = Array.from(new Set(analytics.filteredRows.map((row) => row.agentGroup)));
  const groupBars = analytics.top.botGroups.map((item) => ({
    ...item,
    name: agentGroupLabels[item.label as keyof typeof agentGroupLabels] ?? item.label,
    color: getAgentGroupColor(item.label),
  }));
  const agentBars = analytics.top.agents.map((item, index) => ({
    ...item,
    name: truncateMiddle(item.label, 18),
    color: chartColors[index % chartColors.length],
  }));
  const sectionBars = analytics.top.sections.slice(0, 10).map((item, index) => ({
    ...item,
    name: truncateMiddle(item.label, 16),
    color: chartColors[index % chartColors.length],
  }));
  const statusBars = analytics.top.statuses.map((item, index) => ({
    ...item,
    name: truncateMiddle(item.label, 18),
    color: chartColors[index % chartColors.length],
  }));

  return (
    <section className="grid gap-3">
      <div className="chart-grid grid gap-3">
        <Panel title="Запросы по дням" subtitle="Основные группы ботов в динамике по дням" bodyClassName="height-chart">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.daily} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
              <defs>
                {groups.map((group) => (
                  <linearGradient key={group} id={`daily-${group}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={getAgentGroupColor(group)} stopOpacity={0.34} />
                    <stop offset="95%" stopColor={getAgentGroupColor(group)} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<TooltipBox />} />
              {groups.map((group) => (
                <Area key={group} dataKey={group} name={agentGroupLabels[group]} type="monotone" stroke={getAgentGroupColor(group)} fill={`url(#daily-${group})`} strokeWidth={2.25} isAnimationActive={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <SmallBar title="Разделы сайта" subtitle="Топ-10 разделов по количеству запросов." data={sectionBars} height={300} showAllLabels />
      </div>
      <div className="three-grid grid gap-3">
        <SmallBar title="Группы ботов" subtitle="Кто даёт основной поток." data={groupBars} />
        <SmallBar title="Топ user-agent" subtitle="Какие ИИ-боты встречаются чаще всего." data={agentBars} />
        <SmallBar title="Статусы запросов" subtitle="Статистика пропущенных и заблокированных запросов" data={statusBars} />
      </div>
    </section>
  );
}

function getAgentGroupColor(group: string) {
  return agentGroupChartColors[group as AgentGroup] ?? chartColors[0];
}

function getTooltipColor(item: any) {
  return item.color || item.payload?.color || item.fill || item.stroke || chartColors[0];
}

function SmallBar({ title, subtitle, data, valueKey = 'count', height = 260, showAllLabels = false }: { title: string; subtitle: string; data: Array<{ name: string; count: number; color: string }>; valueKey?: string; height?: number; showAllLabels?: boolean }) {
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
